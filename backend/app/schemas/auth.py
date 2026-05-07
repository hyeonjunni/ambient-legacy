from pydantic import BaseModel, EmailStr


class GoogleAuthRequest(BaseModel):
    google_sub: str | None = None
    email: EmailStr | None = None
    name: str | None = None
    profile_image: str | None = None


class UserProfileUpdateRequest(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: EmailStr


class UserResponse(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    profile_image: str | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    profile_chunk: str | None = None
