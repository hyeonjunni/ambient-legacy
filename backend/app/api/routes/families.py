import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import generate_invite_code
from app.models.family import FamilyMember, FamilyRoom
from app.models.user import User
from app.schemas.family import (
    FamilyCreateRequest,
    FamilyDetailResponse,
    FamilyJoinRequest,
    FamilyJoinPreviewResponse,
    FamilyMemberResponse,
    FamilyResponse,
)
from app.services.account_cleanup import delete_family_room_with_related_data


router = APIRouter()
VALID_MEMBER_RELATIONS = {"parent", "child"}


def ensure_family_member(db: Session, room_id: str, user_id: str) -> FamilyMember:
    membership = db.scalar(
        select(FamilyMember).where(
            FamilyMember.room_id == room_id,
            FamilyMember.user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=403, detail="User is not a member of this family room")
    return membership


def build_family_member_responses(db: Session, room_id: str) -> list[FamilyMemberResponse]:
    member_rows = db.execute(
        select(FamilyMember, User)
        .join(User, User.id == FamilyMember.user_id)
        .where(FamilyMember.room_id == room_id)
    ).all()

    member_name_map = {user.id: user.name for member, user in member_rows}

    return [
        FamilyMemberResponse(
            room_id=member.room_id,
            user_id=member.user_id,
            role=member.role,
            name=user.name,
            email=user.email,
            profile_image=user.profile_image,
            age=user.age,
            gender=user.gender,
            phone=user.phone,
            profile_chunk=user.profile_chunk,
            related_to_user_id=member.related_to_user_id,
            related_to_user_name=member_name_map.get(member.related_to_user_id),
            relation_to_related_user=member.relation_to_related_user,
        )
        for member, user in member_rows
    ]


@router.get("", response_model=list[FamilyResponse])
def list_user_families(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.execute(
        select(FamilyMember, FamilyRoom)
        .join(FamilyRoom, FamilyRoom.id == FamilyMember.room_id)
        .where(FamilyMember.user_id == current_user.id)
    ).all()

    return [
        FamilyResponse(
            room_id=room.id,
            name=room.name,
            invite_code=room.invite_code,
            owner_user_id=room.owner_user_id,
        )
        for _member, room in memberships
    ]


@router.post("", response_model=FamilyResponse)
def create_family(payload: FamilyCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invite_code = generate_invite_code()
    while db.scalar(select(FamilyRoom).where(FamilyRoom.invite_code == invite_code)) is not None:
        invite_code = generate_invite_code()

    room = FamilyRoom(
        id=str(uuid.uuid4()),
        name=payload.name,
        invite_code=invite_code,
        owner_user_id=current_user.id,
    )
    db.add(room)
    db.flush()

    member = FamilyMember(
        id=str(uuid.uuid4()),
        room_id=room.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(room)

    return FamilyResponse(
        room_id=room.id,
        name=room.name,
        invite_code=room.invite_code,
        owner_user_id=room.owner_user_id,
    )


@router.post("/join", response_model=FamilyResponse)
def join_family(payload: FamilyJoinRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.scalar(select(FamilyRoom).where(FamilyRoom.invite_code == payload.invite_code.upper()))
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

    existing_member = db.scalar(
        select(FamilyMember).where(
            FamilyMember.room_id == room.id,
            FamilyMember.user_id == current_user.id,
        )
    )

    if existing_member is None:
        existing_room_members = db.scalars(
            select(FamilyMember).where(FamilyMember.room_id == room.id)
        ).all()

        if existing_room_members:
            if not payload.related_to_user_id or payload.relation_to_related_user not in VALID_MEMBER_RELATIONS:
                raise HTTPException(
                    status_code=400,
                    detail="Joining a family room requires selecting an existing member and whether you are their parent or child.",
                )

            related_member = db.scalar(
                select(FamilyMember).where(
                    FamilyMember.room_id == room.id,
                    FamilyMember.user_id == payload.related_to_user_id,
                )
            )
            if related_member is None:
                raise HTTPException(status_code=400, detail="Selected related family member is not in this room")

        db.add(
            FamilyMember(
                id=str(uuid.uuid4()),
                room_id=room.id,
                user_id=current_user.id,
                role="member",
                related_to_user_id=payload.related_to_user_id,
                relation_to_related_user=payload.relation_to_related_user,
            )
        )
        db.commit()

    return FamilyResponse(
        room_id=room.id,
        name=room.name,
        invite_code=room.invite_code,
        owner_user_id=room.owner_user_id,
    )


@router.get("/invite/{invite_code}", response_model=FamilyJoinPreviewResponse)
def preview_family_by_invite_code(invite_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.scalar(select(FamilyRoom).where(FamilyRoom.invite_code == invite_code.upper()))
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

    members = build_family_member_responses(db, room.id)

    return FamilyJoinPreviewResponse(
        room_id=room.id,
        name=room.name,
        invite_code=room.invite_code,
        owner_user_id=room.owner_user_id,
        members=members,
    )


@router.get("/{room_id}", response_model=FamilyDetailResponse)
def get_family(room_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.get(FamilyRoom, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

    ensure_family_member(db, room_id, current_user.id)

    member_count = db.scalar(
        select(func.count(FamilyMember.id)).where(FamilyMember.room_id == room_id)
    ) or 0

    return FamilyDetailResponse(
        room_id=room.id,
        name=room.name,
        invite_code=room.invite_code,
        owner_user_id=room.owner_user_id,
        member_count=member_count,
    )


@router.get("/{room_id}/members", response_model=list[FamilyMemberResponse])
def list_family_members(room_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.get(FamilyRoom, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

    ensure_family_member(db, room_id, current_user.id)
    return build_family_member_responses(db, room_id)


@router.delete("/{room_id}")
def delete_family(room_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.get(FamilyRoom, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

    if room.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room owner can delete this family room")

    cleanup_failed_count = delete_family_room_with_related_data(db, room)
    db.commit()

    return {
        "deleted": True,
        "room_id": room_id,
        "media_cleanup_failed_count": cleanup_failed_count,
    }
