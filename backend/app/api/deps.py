from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    access_token: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = None
    if credentials is not None and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(status_code=401, detail="Authentication credentials were not provided")

    try:
        payload = decode_access_token(token)
    except Exception as error:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from error

    user_id = str(payload.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid access token payload")

    user = db.get(User, user_id)
    if user is None or not user.username or not user.password_hash:
        raise HTTPException(status_code=401, detail="Authenticated user not found")

    return user
