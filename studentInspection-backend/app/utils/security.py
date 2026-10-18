from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi import Request, HTTPException, status
from passlib.context import CryptContext
from jose import jwt
import os

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("EXPIRES_IN")

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

def validate_password_length(password: str) -> None:
    if not isinstance(password, str):
        raise ValueError("Password must be a string")

    if len(password.encode("utf-8")) > 72:
        raise ValueError(
            "Password must not exceed 72 UTF-8 bytes when using bcrypt"
        )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    validate_password_length(plain_password)

    if not isinstance(hashed_password, str) or not hashed_password:
        return False

    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    validate_password_length(password)
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Reads from request.state.user populated by auth_middleware
async def get_current_user(request: Request):
    if not hasattr(request.state, "user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return request.state.user