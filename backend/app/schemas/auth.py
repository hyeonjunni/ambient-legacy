from pydantic import BaseModel, EmailStr


class GoogleAuthRequest(BaseModel):
    google_sub: str
    email: EmailStr
    name: str
    profile_image: str | None = None


class UserResponse(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    profile_image: str | None = None
