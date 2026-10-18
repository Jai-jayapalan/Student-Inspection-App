from fastapi import Request, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from pathlib import Path
from dotenv import load_dotenv
import logging
import os

env_file = Path(__file__).resolve().parents[2] / ".env.development"
load_dotenv(dotenv_path=env_file)

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM")

# Paths that bypass auth middleware
PUBLIC_PATHS = ["/api/auth/login", "/api/auth/signup", "/docs", "/openapi.json"]

async def global_error_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logging.error(f"Global Error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal Server Error"}
        )

async def auth_middleware(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS:
        return await call_next(request)
        
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            content={"detail": "Missing or invalid authorization token"}
        )
        
    token = auth_header.split(" ")[1]
    try:
        # JWT validation originally from auth.py
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                content={"detail": "Invalid token payload"}
            )
        
        # Attach user to request state for routes to access
        request.state.user = {"email": email}
    except JWTError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            content={"detail": "Could not validate credentials"}
        )
        
    return await call_next(request)