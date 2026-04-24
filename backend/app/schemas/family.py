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


class FamilyDetailResponse(FamilyResponse):
    member_count: int
