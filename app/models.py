from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
from sqlalchemy.orm import declarative_base
from datetime import datetime
import enum


from app.db import Base


class JobSource(enum.Enum):
    wellfound = "wellfound"
    linkedin = "linkedin"
    naukri = "naukri"


class JobLink(Base):
    __tablename__ = "job_links"

    id = Column(Integer, primary_key=True)

    # core info
    url = Column(String, unique=True, index=True, nullable=False)
    source = Column(Enum(JobSource), index=True, nullable=False)

    # scraper + llm workflow
    job_description = Column(Text, nullable=True)
    scraped = Column(Boolean, default=False)

    location = Column(String, nullable=True)
    match_score = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
