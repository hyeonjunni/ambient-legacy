from pydantic import BaseModel


class FamilyCreateRequest(BaseModel):
    owner_user_id: str
    name: str


class FamilyJoinRequest(BaseModel):
    user_id: str
    invite_code: str


class FamilyResponse(BaseModel):
    room_id: str
    name: str
    invite_code: str
    owner_user_id: str


class FamilyMemberResponse(BaseModel):
    room_id: str
    user_id: str
    role: str
    name: str
    email: str
    profile_image: str | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    profile_chunk: str | None = None


class FamilyDetailResponse(FamilyResponse):
    member_count: int
