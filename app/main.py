# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from app.db import SessionLocal, engine, Base
from app.models import JobLink
from app.schemas import CaptureReq, ScrapedDataReq

app = FastAPI()

# 🔥 Create tables on startup


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/capture-links")
async def capture_links(req: CaptureReq):
    added = 0

    async with SessionLocal() as session:
        for link in req.links:
            result = await session.execute(
                select(JobLink).where(JobLink.url == link)
            )
            existing = result.scalar_one_or_none()

            if not existing:
                session.add(
                    JobLink(
                        url=link,
                        source=req.source
                    )
                )
                added += 1

        await session.commit()

    return {"added": added}


@app.get("/jobs/unscraped")
async def get_unscraped_jobs():
    """Return all jobs that haven't been scraped yet"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(JobLink).where(JobLink.scraped == False)
        )
        jobs = result.scalars().all()
        return [{"id": job.id, "url": job.url, "source": job.source.value} for job in jobs]


@app.post("/jobs/{job_id}/scraped-data")
async def save_scraped_data(job_id: int, req: ScrapedDataReq):
    """Save scraped JD content back to DB"""
    async with SessionLocal() as session:
        result = await session.execute(
            select(JobLink).where(JobLink.id == job_id)
        )
        job = result.scalar_one_or_none()

        if not job:
            return {"error": "Job not found"}

        job.job_description = req.job_description
        job.location = req.location
        job.scraped = True

        await session.commit()

    return {"success": True, "id": job_id}
