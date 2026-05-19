import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import AuthSessionResponse, LoginRequest, SignUpRequest, UserProfileUpdateRequest, UserResponse
from app.services.account_cleanup import delete_user_account_data


router = APIRouter()
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{4,24}$")


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
        username=user.username,
        email=user.email,
        name=user.name,
        profile_image=user.profile_image,
        age=user.age,
        gender=user.gender,
        phone=user.phone,
        profile_chunk=user.profile_chunk,
    )


def build_session_response(user: User) -> AuthSessionResponse:
    return AuthSessionResponse(
        access_token=create_access_token(user.id),
        user=serialize_user(user),
    )


def validate_username(username: str) -> str:
    normalized = username.strip()
    if not USERNAME_PATTERN.fullmatch(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 4-24 characters and use only letters, numbers, dots, hyphens, or underscores",
        )
    return normalized


@router.post("/signup", response_model=AuthSessionResponse)
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    username = validate_username(payload.username)
    email = str(payload.email).strip().lower()

    existing_user = db.scalar(
        select(User).where(
            or_(
                User.username == username,
                User.email == email,
                User.google_sub == f"local:{username}",
            )
        )
    )
    if existing_user is not None:
        duplicate_field = "username" if existing_user.username == username or existing_user.google_sub == f"local:{username}" else "email"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Duplicate {duplicate_field}")

    user = User(
        id=str(uuid.uuid4()),
        google_sub=f"local:{username}",
        username=username,
        password_hash=hash_password(payload.password),
        email=email,
        name=payload.name.strip(),
        profile_image=None,
    )
    user.profile_chunk = build_profile_chunk(user.name, user.age, user.gender, user.phone, user.email)

    db.add(user)
    db.commit()
    db.refresh(user)
    return build_session_response(user)


@router.post("/login", response_model=AuthSessionResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return build_session_response(user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


@router.put("/profile", response_model=UserResponse)
def update_my_profile(
    payload: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.name = payload.name
    current_user.age = payload.age
    current_user.gender = payload.gender
    current_user.phone = payload.phone
    current_user.email = str(payload.email).strip().lower()
    current_user.profile_chunk = build_profile_chunk(
        current_user.name,
        current_user.age,
        current_user.gender,
        current_user.phone,
        current_user.email,
    )

    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)


@router.delete("/me")
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cleanup_failed_count = delete_user_account_data(db, current_user)
    db.commit()
    return {
        "deleted": True,
        "user_id": current_user.id,
        "media_cleanup_failed_count": cleanup_failed_count,
    }
