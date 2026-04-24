import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, UserResponse


router = APIRouter()


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

    db.commit()
    db.refresh(user)

    return UserResponse(
        user_id=user.id,
        email=user.email,
        name=user.name,
        profile_image=user.profile_image,
    )
