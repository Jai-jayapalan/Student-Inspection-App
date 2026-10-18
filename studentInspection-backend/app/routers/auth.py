from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from app.models.schemas import UserAuth, UserProfileUpdate
from app.config.db import db
from app.utils.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/signup")
async def signup(user: UserAuth):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    name = user.name.strip() if user.name else None
    user_dict = {
        "email": user.email,
        "hashed_password": get_password_hash(user.password),
        "created_at": datetime.utcnow(),
    }
    if name:
        user_dict["name"] = name
    await db.users.insert_one(user_dict)
    return {"msg": "User created successfully"}

@router.post("/login")
async def login(user: UserAuth):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": db_user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    db_user = await db.users.find_one(
        {"email": user["email"]},
        {"_id": 0, "email": 1, "name": 1},
    )
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": db_user["email"], "name": db_user.get("name", "")}

@router.patch("/me")
async def update_profile(
    profile: UserProfileUpdate,
    user: dict = Depends(get_current_user),
):
    name = profile.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    result = await db.users.update_one(
        {"email": user["email"]},
        {"$set": {"name": name}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": user["email"], "name": name}