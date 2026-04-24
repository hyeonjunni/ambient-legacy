import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import generate_invite_code
from app.models.family import FamilyMember, FamilyRoom
from app.models.user import User
from app.schemas.family import (
    FamilyCreateRequest,
    FamilyDetailResponse,
    FamilyJoinRequest,
    FamilyMemberResponse,
    FamilyResponse,
)


router = APIRouter()


@router.post("", response_model=FamilyResponse)
def create_family(payload: FamilyCreateRequest, db: Session = Depends(get_db)):
    owner = db.get(User, payload.owner_user_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Owner user not found")

    invite_code = generate_invite_code()
    while db.scalar(select(FamilyRoom).where(FamilyRoom.invite_code == invite_code)) is not None:
        invite_code = generate_invite_code()

    room = FamilyRoom(
        id=str(uuid.uuid4()),
        name=payload.name,
        invite_code=invite_code,
        owner_user_id=payload.owner_user_id,
    )
    db.add(room)
    db.flush()

    member = FamilyMember(
        id=str(uuid.uuid4()),
        room_id=room.id,
        user_id=payload.owner_user_id,
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
def join_family(payload: FamilyJoinRequest, db: Session = Depends(get_db)):
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    room = db.scalar(select(FamilyRoom).where(FamilyRoom.invite_code == payload.invite_code))
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

    existing_member = db.scalar(
        select(FamilyMember).where(
            FamilyMember.room_id == room.id,
            FamilyMember.user_id == payload.user_id,
        )
    )

    if existing_member is None:
        db.add(
            FamilyMember(
                id=str(uuid.uuid4()),
                room_id=room.id,
                user_id=payload.user_id,
                role="member",
            )
        )
        db.commit()

    return FamilyResponse(
        room_id=room.id,
        name=room.name,
        invite_code=room.invite_code,
        owner_user_id=room.owner_user_id,
    )


@router.get("/{room_id}", response_model=FamilyDetailResponse)
def get_family(room_id: str, db: Session = Depends(get_db)):
    room = db.get(FamilyRoom, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

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
def list_family_members(room_id: str, db: Session = Depends(get_db)):
    room = db.get(FamilyRoom, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Family room not found")

    members = db.scalars(
        select(FamilyMember).where(FamilyMember.room_id == room_id)
    ).all()

    return [
        FamilyMemberResponse(
            room_id=member.room_id,
            user_id=member.user_id,
            role=member.role,
        )
        for member in members
    ]
