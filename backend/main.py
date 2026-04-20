import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from backend.routes import applications, application_fields, documents, jobs, profiles

app = FastAPI(title="HireMind API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten with EXTENSION_ID + FRONTEND_URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router, prefix="/api")
app.include_router(application_fields.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
