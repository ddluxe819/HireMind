"""
Generate a tailored resume variant + cover letter for a queued application.
Usage: python tools/resume_generator.py <app_id>
"""
import sys
from db_client import get_applications, generate_documents, update_status


def run(app_id: str):
    apps = get_applications()
    app = next((a for a in apps if a["id"] == app_id), None)
    if not app:
        print(f"[error] Application {app_id} not found")
        sys.exit(1)

    if not app.get("resume_base_id"):
        print("[error] No resume_base_id set on this application. Attach a base resume first.")
        sys.exit(1)

    print(f"[resume_generator] Generating docs for {app['title']} @ {app['company']}…")

    result = generate_documents(
        job_id=app["job_id"],
        company=app["company"],
        title=app["title"],
        job_description=app.get("notes") or f"{app['title']} at {app['company']}",
        resume_base_id=app["resume_base_id"],
    )

    print(f"[resume_generator] Done. Resume variant: {result['resume_variant_id']}")
    print(f"[resume_generator] Cover letter: {result['cover_letter_id']}")
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python resume_generator.py <app_id>")
        sys.exit(1)
    run(sys.argv[1])
