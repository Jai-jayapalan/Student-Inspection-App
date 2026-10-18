from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from typing import Optional
from datetime import datetime
from bson import ObjectId
import pandas as pd
import io
import math

from app.models.schemas import InspectionCreate, InspectionUpdate
from app.config.db import db
from app.utils.security import get_current_user

router = APIRouter(prefix="/api", tags=["Inspections"])

async def _get_officer_name(email: str) -> str:
    user = await db.users.find_one({"email": email}, {"_id": 0, "name": 1})
    return (user or {}).get("name") or email

def _parse_inspection_id(inspection_id: str) -> ObjectId:
    if not ObjectId.is_valid(inspection_id):
        raise HTTPException(status_code=400, detail="Invalid inspection ID")
    return ObjectId(inspection_id)

async def _serialize_inspection(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if not doc.get("officer_name"):
        doc["officer_name"] = await _get_officer_name(doc.get("officer_email", ""))
    return doc

@router.get("/config/active")
async def get_active_config(user: dict = Depends(get_current_user)):
    config = await db.form_configs.find_one({"is_active": True}, {"_id": 0})
    if not config:
        default_config = {
            "version": 1,
            "is_active": True,
            "sections": [
                {"name": "School Details", "fields": [{"name": "School Name", "type": "text", "required": True}, {"name": "UDISE Code", "type": "text", "required": True}]},
                {"name": "Academics", "fields": [{"name": "Teacher Attendance %", "type": "number", "required": True}]},
                {"name": "School Infrastructure", "fields": [{"name": "Has Library?", "type": "boolean", "required": True}]},
                {"name": "Sanitation", "fields": [{"name": "Functional Toilets", "type": "number", "required": True}]},
                {"name": "Students Follow-up", "fields": [{"name": "Dropout Rate %", "type": "number", "required": True}]}
            ]
        }
        await db.form_configs.insert_one(default_config)
        del default_config["_id"]
        return default_config
    return config

@router.post("/inspections")
async def create_inspection(inspection: InspectionCreate, user: dict = Depends(get_current_user)):
    doc = {
        "officer_email": user["email"],
        "officer_name": await _get_officer_name(user["email"]),
        "config_version": inspection.config_version,
        "data": inspection.data,
        "created_at": datetime.utcnow()
    }
    await db.inspections.insert_one(doc)
    return {"msg": "Inspection saved"}

@router.get("/inspections")
async def get_inspections(
    request: Request,
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    params = request.query_params
    for key, value in params.items():
        if key not in ["page", "limit", "search"] and value:
            query[f"data.{key}"] = {"$regex": value, "$options": "i"} 
            
    if search:
        query["$or"] = [
            {"data.School Name": {"$regex": search, "$options": "i"}},
            {"data.UDISE Code": {"$regex": search, "$options": "i"}},
            {"officer_email": {"$regex": search, "$options": "i"}},
            {"officer_name": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    cursor = db.inspections.find(query).sort("created_at", -1).skip(skip).limit(limit)
    records = []
    async for doc in cursor:
        records.append(await _serialize_inspection(doc))
        
    total = await db.inspections.count_documents(query)
    return {
        "data": records,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

@router.get("/inspections/{inspection_id}")
async def get_inspection(
    inspection_id: str,
    user: dict = Depends(get_current_user),
):
    doc = await db.inspections.find_one({"_id": _parse_inspection_id(inspection_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return await _serialize_inspection(doc)

@router.put("/inspections/{inspection_id}")
@router.patch("/inspections/{inspection_id}")
async def update_inspection(
    inspection_id: str,
    inspection: InspectionUpdate,
    user: dict = Depends(get_current_user),
):
    updates = inspection.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No inspection fields provided")
    if any(value is None for value in updates.values()):
        raise HTTPException(status_code=422, detail="Inspection fields cannot be null")

    object_id = _parse_inspection_id(inspection_id)
    result = await db.inspections.update_one(
        {"_id": object_id, "officer_email": user["email"]},
        {"$set": {**updates, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        exists = await db.inspections.find_one({"_id": object_id}, {"_id": 1})
        if not exists:
            raise HTTPException(status_code=404, detail="Inspection not found")
        raise HTTPException(status_code=403, detail="Cannot update another officer's inspection")
    doc = await db.inspections.find_one({"_id": object_id})
    return await _serialize_inspection(doc)

@router.delete("/inspections/{inspection_id}")
async def delete_inspection(
    inspection_id: str,
    user: dict = Depends(get_current_user),
):
    object_id = _parse_inspection_id(inspection_id)
    result = await db.inspections.delete_one(
        {"_id": object_id, "officer_email": user["email"]}
    )
    if result.deleted_count == 0:
        exists = await db.inspections.find_one({"_id": object_id}, {"_id": 1})
        if not exists:
            raise HTTPException(status_code=404, detail="Inspection not found")
        raise HTTPException(status_code=403, detail="Cannot delete another officer's inspection")
    return {"msg": "Inspection deleted successfully"}

@router.post("/inspections/import")
async def import_data(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        config = await db.form_configs.find_one({"is_active": True})
        if not config: raise HTTPException(status_code=400, detail="No active config")
        
        expected_fields = [f["name"] for s in config["sections"] for f in s["fields"]]
        officer_name = await _get_officer_name(user["email"])
        
        success = 0
        errors = []
        for index, row in df.iterrows():
            try:
                row_dict = row.to_dict()
                missing = [f for f in expected_fields if f not in row_dict or pd.isna(row_dict[f])]
                if missing:
                    errors.append(f"Row {index + 2}: Missing fields {missing}")
                    continue
                
                clean_data = {k: v for k, v in row_dict.items() if not pd.isna(v)}
                await db.inspections.insert_one({
                    "officer_email": user["email"],
                    "officer_name": officer_name,
                    "config_version": config["version"],
                    "data": clean_data,
                    "created_at": datetime.utcnow()
                })
                success += 1
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
                
        return {"imported": success, "errors": errors}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File processing failed: {str(e)}")

@router.post("/inspections/seed")
async def seed_data(user: dict = Depends(get_current_user)):
    config = await db.form_configs.find_one({"is_active": True})
    if not config: raise HTTPException(status_code=400, detail="Initialize form config first")
    
    sample_data = [
        {"School Name": "Govt High School Central", "UDISE Code": "27301", "Teacher Attendance %": 95, "Has Library?": True, "Functional Toilets": 4, "Dropout Rate %": 2},
        {"School Name": "Primary Public School East", "UDISE Code": "27302", "Teacher Attendance %": 82, "Has Library?": False, "Functional Toilets": 2, "Dropout Rate %": 8},
        {"School Name": "West End Academy", "UDISE Code": "27303", "Teacher Attendance %": 99, "Has Library?": True, "Functional Toilets": 8, "Dropout Rate %": 0},
    ]
    
    officer_name = await _get_officer_name(user["email"])
    docs = [
        {
            "officer_email": user["email"],
            "officer_name": officer_name,
            "config_version": config["version"],
            "data": data,
            "created_at": datetime.utcnow(),
        }
        for data in sample_data
    ]
    await db.inspections.insert_many(docs)
    return {"msg": f"Seeded {len(docs)} records."}