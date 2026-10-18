from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.middleware.handlers import auth_middleware, global_error_middleware
from app.routers import auth, inspections

app = FastAPI(title="School Inspection API")

# Mount Middlewares: Add global error handling first, then auth
app.add_middleware(BaseHTTPMiddleware, dispatch=auth_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(BaseHTTPMiddleware, dispatch=global_error_middleware)

# Register all split routes
app.include_router(auth.router)
app.include_router(inspections.router)