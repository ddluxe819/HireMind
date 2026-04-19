from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from typing import List

from backend.db.database import get_db
from backend.models.application import ApplicationCreate, ApplicationUpdate, ApplicationOut, ApplicationStatus

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/", response_model=List[ApplicationOut])
def list_applications(db: Client = Depends(get_db)):
    result = db.table("applications").select("*").order("created_at", desc=True).execute()
    return result.data


@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(app_id: str, db: Client = Depends(get_db)):
    result = db.table("applications").select("*").eq("id", app_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data


@router.post("/", response_model=ApplicationOut, status_code=201)
def create_application(payload: ApplicationCreate, db: Client = Depends(get_db)):
    result = db.table("applications").insert(payload.model_dump(exclude_none=True)).execute()
    return result.data[0]


@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(app_id: str, payload: ApplicationUpdate, db: Client = Depends(get_db)):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("applications").update(updates).eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data[0]


@router.patch("/{app_id}/status")
def update_status(app_id: str, status: ApplicationStatus, db: Client = Depends(get_db)):
    result = db.table("applications").update({"status": status.value}).eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"id": app_id, "status": status}


@router.delete("/{app_id}", status_code=204)
def delete_application(app_id: str, db: Client = Depends(get_db)):
    db.table("applications").delete().eq("id", app_id).execute()
