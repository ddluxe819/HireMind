from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from backend.db.database import get_db
from backend.models.profile import ProfileCreate, ProfileOut

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.post("/", response_model=ProfileOut, status_code=201)
def create_profile(payload: ProfileCreate, db: Client = Depends(get_db)):
    result = db.table("profiles").insert(payload.model_dump(exclude_none=True)).execute()
    return result.data[0]


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: str, db: Client = Depends(get_db)):
    result = db.table("profiles").select("*").eq("id", profile_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data


@router.patch("/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: str, payload: ProfileCreate, db: Client = Depends(get_db)):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("profiles").update(updates).eq("id", profile_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data[0]
