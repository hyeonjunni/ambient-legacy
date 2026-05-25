from pydantic import BaseModel


class FamilyCreateRequest(BaseModel):
    name: str


class FamilyJoinRequest(BaseModel):
    invite_code: str
    related_to_user_id: str | None = None
    relation_to_related_user: str | None = None


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
    related_to_user_id: str | None = None
    related_to_user_name: str | None = None
    relation_to_related_user: str | None = None


class FamilyDetailResponse(FamilyResponse):
    member_count: int


class FamilyJoinPreviewResponse(FamilyResponse):
    members: list[FamilyMemberResponse]
