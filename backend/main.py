"""Main application entry point."""
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from models import init_db
from api import api_router
from scheduler import scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting up...")
    init_db()
    scheduler.start()
    print(f"Server running on http://{settings.backend_host}:{settings.backend_port}")
    yield
    # Shutdown
    print("Shutting down...")
    scheduler.shutdown()


app = FastAPI(
    title="Crontab Manager",
    description="A crontab-based script task management platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Static files (for production build)
try:
    app.mount("/static", StaticFiles(directory="../frontend/dist"), name="static")
except Exception:
    pass


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Crontab Manager",
        "version": "2.0.0",
        "docs": "/docs",
        "mode": "crontab",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
    )
