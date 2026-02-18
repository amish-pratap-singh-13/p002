from pydantic import BaseModel
from typing import List
from app.models import JobSource


class CaptureReq(BaseModel):
    source: JobSource
    links: List[str]


class ScrapedDataReq(BaseModel):
    job_description: str | None = None
    location: str | None = None
