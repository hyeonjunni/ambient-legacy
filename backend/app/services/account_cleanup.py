import logging

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.routes.uploads import LOCAL_MEDIA_ROOT, delete_gcs_blob
from app.models.family import FamilyMember, FamilyRoom
from app.models.upload import Upload, UploadFile
from app.models.user import User


logger = logging.getLogger(__name__)


def _cleanup_upload_files(upload_files: list[UploadFile]) -> int:
    cleanup_failed = 0

    for upload_file in upload_files:
        try:
            if upload_file.storage_bucket == "local-media":
                local_path = LOCAL_MEDIA_ROOT / upload_file.storage_path
                if local_path.exists():
                    local_path.unlink()
            else:
                delete_gcs_blob(upload_file.storage_bucket, upload_file.storage_path)
        except Exception as error:
            cleanup_failed += 1
            logger.warning(
                "Failed to delete media file (%s/%s): %s",
                upload_file.storage_bucket,
                upload_file.storage_path,
                error,
            )

    return cleanup_failed


def delete_family_room_with_related_data(db: Session, room: FamilyRoom) -> int:
    upload_files = db.scalars(
        select(UploadFile)
        .join(Upload, Upload.id == UploadFile.upload_id)
        .where(Upload.room_id == room.id)
    ).all()

    cleanup_failed = _cleanup_upload_files(upload_files)

    room_upload_ids = select(Upload.id).where(Upload.room_id == room.id)
    db.query(UploadFile).filter(UploadFile.upload_id.in_(room_upload_ids)).delete(synchronize_session=False)
    db.query(Upload).filter(Upload.room_id == room.id).delete(synchronize_session=False)
    db.query(FamilyMember).filter(FamilyMember.room_id == room.id).delete(synchronize_session=False)
    db.delete(room)

    return cleanup_failed


def delete_user_uploaded_records(db: Session, user_id: str) -> int:
    upload_ids = db.scalars(select(Upload.id).where(Upload.uploader_user_id == user_id)).all()
    if not upload_ids:
        return 0

    upload_files = db.scalars(
        select(UploadFile).where(UploadFile.upload_id.in_(upload_ids))
    ).all()

    cleanup_failed = _cleanup_upload_files(upload_files)

    db.query(UploadFile).filter(UploadFile.upload_id.in_(upload_ids)).delete(synchronize_session=False)
    db.query(Upload).filter(Upload.id.in_(upload_ids)).delete(synchronize_session=False)

    return cleanup_failed


def delete_user_account_data(db: Session, user: User) -> int:
    cleanup_failed = 0

    owned_rooms = db.scalars(
        select(FamilyRoom).where(FamilyRoom.owner_user_id == user.id)
    ).all()
    for room in owned_rooms:
        cleanup_failed += delete_family_room_with_related_data(db, room)

    cleanup_failed += delete_user_uploaded_records(db, user.id)

    db.query(FamilyMember).filter(FamilyMember.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)

    return cleanup_failed


def purge_legacy_google_users(db: Session) -> int:
    legacy_users = db.scalars(
        select(User).where(
            or_(
                User.username.is_(None),
                User.password_hash.is_(None),
            )
        )
    ).all()

    if not legacy_users:
        return 0

    removed_count = 0
    for user in legacy_users:
        delete_user_account_data(db, user)
        removed_count += 1

    db.commit()
    logger.info("Purged %s legacy Google-auth user account(s).", removed_count)
    return removed_count
