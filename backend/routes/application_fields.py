from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from backend.db.database import get_db
from backend.models.application_fields import (
    ApplicationFieldsOut,
    ApplicationFieldsUpdate,
)

router = APIRouter(prefix="/applications", tags=["application-fields"])


def _get_or_create(app_id: str, db: Client) -> dict:
    existing = db.table("application_fields").select("*").eq("application_id", app_id).execute()
    if existing.data:
        return existing.data[0]
    inserted = db.table("application_fields").insert({
        "application_id": app_id,
        "fields": {},
        "custom_answers": [],
    }).execute()
    return inserted.data[0]


@router.get("/{app_id}/fields", response_model=ApplicationFieldsOut)
def get_application_fields(app_id: str, db: Client = Depends(get_db)):
    app_check = db.table("applications").select("id").eq("id", app_id).execute()
    if not app_check.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return _get_or_create(app_id, db)


@router.patch("/{app_id}/fields", response_model=ApplicationFieldsOut)
def update_application_fields(
    app_id: str,
    payload: ApplicationFieldsUpdate,
    db: Client = Depends(get_db),
):
    current = _get_or_create(app_id, db)

    updates = {}
    if payload.fields is not None:
        merged = {**(current.get("fields") or {}), **payload.fields}
        updates["fields"] = merged
    if payload.custom_answers is not None:
        updates["custom_answers"] = [a.model_dump() for a in payload.custom_answers]

    if not updates:
        return current

    from datetime import datetime, timezone
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = db.table("application_fields").update(updates).eq("application_id", app_id).execute()
    return result.data[0]


@router.post("/{app_id}/fields/custom-answers", response_model=ApplicationFieldsOut)
def append_custom_answers(
    app_id: str,
    payload: ApplicationFieldsUpdate,
    db: Client = Depends(get_db),
):
    """Merge newly-detected custom questions without overwriting existing answers.
    Matches by question id; existing answers are preserved."""
    if not payload.custom_answers:
        raise HTTPException(status_code=400, detail="custom_answers required")

    current = _get_or_create(app_id, db)
    existing = current.get("custom_answers") or []
    by_id = {a["id"]: a for a in existing}

    for incoming in payload.custom_answers:
        inc = incoming.model_dump()
        if inc["id"] in by_id:
            prior = by_id[inc["id"]]
            prior["question"] = inc.get("question") or prior.get("question")
            prior["selector"] = inc.get("selector") or prior.get("selector")
        else:
            by_id[inc["id"]] = inc

    from datetime import datetime, timezone
    result = db.table("application_fields").update({
        "custom_answers": list(by_id.values()),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("application_id", app_id).execute()
    return result.data[0]
