from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class CustomAnswer(BaseModel):
    id: str
    question: str
    answer: Optional[str] = ""
    selector: Optional[str] = None
    detected_at: Optional[str] = None


class ApplicationFieldsOut(BaseModel):
    application_id: str
    fields: Dict[str, Any] = {}
    custom_answers: List[CustomAnswer] = []
    updated_at: Optional[str] = None


class ApplicationFieldsUpdate(BaseModel):
    fields: Optional[Dict[str, Any]] = None
    custom_answers: Optional[List[CustomAnswer]] = None


# Canonical keys mirrored in the extension's field_matcher FIELD_TYPES.
CANONICAL_KEYS = [
    "firstName", "lastName", "fullName",
    "email", "phone",
    "linkedinUrl", "portfolioUrl", "githubUrl",
    "city", "state", "country", "zip",
    "workAuthorization", "requiresSponsorship",
    "yearsExperience", "salaryExpectation",
    "earliestStartDate", "openToRelocation", "workMode",
    "gender", "ethnicity", "veteranStatus", "disabilityStatus",
]


def build_fields_from_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Project a profile row into the canonical ATS field shape."""
    if not profile:
        return {}

    first = profile.get("first_name")
    last = profile.get("last_name")
    if not first and profile.get("name"):
        parts = profile["name"].split(" ", 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else last

    work_auth = profile.get("work_authorized")
    work_auth_value = None
    if work_auth is True:
        work_auth_value = "yes"
    elif work_auth is False:
        work_auth_value = "no"

    sponsorship = profile.get("requires_sponsorship")
    sponsorship_value = None
    if sponsorship is True:
        sponsorship_value = "yes"
    elif sponsorship is False:
        sponsorship_value = "no"

    return {
        "firstName": first or "",
        "lastName": last or "",
        "email": profile.get("email") or "",
        "phone": profile.get("phone") or "",
        "linkedinUrl": profile.get("linkedin_url") or "",
        "githubUrl": profile.get("github_url") or "",
        "portfolioUrl": profile.get("portfolio_url") or "",
        "city": profile.get("city") or "",
        "state": profile.get("state") or "",
        "country": profile.get("country") or "",
        "zip": profile.get("zip") or "",
        "workAuthorization": work_auth_value or "",
        "requiresSponsorship": sponsorship_value or "",
        "yearsExperience": profile.get("years_experience") or profile.get("experience") or "",
        "salaryExpectation": profile.get("salary") or "",
        "earliestStartDate": profile.get("earliest_start_date") or "",
        "openToRelocation": "yes" if profile.get("open_to_relocation") else ("no" if profile.get("open_to_relocation") is False else ""),
        "workMode": profile.get("work_mode") or "",
        "gender": profile.get("gender") or "",
        "ethnicity": profile.get("ethnicity") or "",
        "veteranStatus": profile.get("veteran_status") or "",
        "disabilityStatus": profile.get("disability_status") or "",
    }
