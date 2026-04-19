"""Thin wrapper around the HireMind backend API for use by WAT tools."""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

BASE_URL = f"http://localhost:{os.getenv('API_PORT', '8000')}/api"


def get_applications(status: str | None = None) -> list[dict]:
    with httpx.Client() as c:
        res = c.get(f"{BASE_URL}/applications/")
        res.raise_for_status()
        apps = res.json()
    if status:
        apps = [a for a in apps if a["status"] == status]
    return apps


def update_status(app_id: str, status: str) -> dict:
    with httpx.Client() as c:
        res = c.patch(f"{BASE_URL}/applications/{app_id}/status", params={"status": status})
        res.raise_for_status()
        return res.json()


def create_application(job_id: str, company: str, title: str, apply_url: str) -> dict:
    with httpx.Client() as c:
        res = c.post(f"{BASE_URL}/applications/", json={
            "job_id": job_id, "company": company, "title": title, "apply_url": apply_url
        })
        res.raise_for_status()
        return res.json()


def generate_documents(job_id: str, company: str, title: str, job_description: str, resume_base_id: str) -> dict:
    with httpx.Client(timeout=60.0) as c:
        res = c.post(f"{BASE_URL}/documents/generate", json={
            "job_id": job_id, "company": company, "title": title,
            "job_description": job_description, "resume_base_id": resume_base_id,
        })
        res.raise_for_status()
        return res.json()
