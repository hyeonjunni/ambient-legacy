import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, UserProfileUpdateRequest, UserResponse


router = APIRouter()


def build_profile_chunk(name: str, age: int | None, gender: str | None, phone: str | None, email: str) -> str:
    parts = [
        f"name: {name}" if name else None,
        f"age: {age}" if age is not None else None,
        f"gender: {gender}" if gender else None,
        f"phone: {phone}" if phone else None,
        f"email: {email}" if email else None,
    ]
    return " | ".join(part for part in parts if part)


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        user_id=user.id,
        email=user.email,
        name=user.name,
        profile_image=user.profile_image,
        age=user.age,
        gender=user.gender,
        phone=user.phone,
        profile_chunk=user.profile_chunk,
    )


@router.post("/google", response_model=UserResponse)
def google_auth_sync(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.google_sub == payload.google_sub))

    if user is None:
        user = User(
            id=str(uuid.uuid4()),
            google_sub=payload.google_sub,
            email=payload.email,
            name=payload.name,
            profile_image=payload.profile_image,
        )
        db.add(user)
    else:
        user.email = str(payload.email)
        user.name = payload.name
        user.profile_image = payload.profile_image

    user.profile_chunk = build_profile_chunk(user.name, user.age, user.gender, user.phone, user.email)

    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.get("/profile/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return serialize_user(user)


@router.put("/profile/{user_id}", response_model=UserResponse)
def update_user_profile(user_id: str, payload: UserProfileUpdateRequest, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.name = payload.name
    user.age = payload.age
    user.gender = payload.gender
    user.phone = payload.phone
    user.email = str(payload.email)
    user.profile_chunk = build_profile_chunk(user.name, user.age, user.gender, user.phone, user.email)

    db.commit()
    db.refresh(user)
    return serialize_user(user)
