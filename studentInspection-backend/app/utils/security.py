
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import Request, HTTPException, status
import os

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Environment variables are strings; convert to an integer.
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("EXPIRES_IN", "30")
)

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is missing")

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    if not isinstance(hashed_password, str) or not hashed_password:
        return False

    if len(plain_password.encode("utf-8")) > 72:
        raise ValueError("Password exceeds bcrypt's 72-byte limit")

    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password exceeds bcrypt's 72-byte limit")

    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


async def get_current_user(request: Request):
    if not hasattr(request.state, "user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return request.state.user
