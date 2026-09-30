"""Vercel entrypoint. Locally run:  uvicorn app.main:app --port 8000"""
from app.main import app  # noqa: F401
