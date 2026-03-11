"""Main application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from api import api_router
from scheduler import scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print("Starting up...")
    # No database initialization needed - crontab is the source of truth
    scheduler.start()
    print(f"Server running on http://{settings.backend_host}:{settings.backend_port}")
    yield
    # Shutdown
    print("Shutting down...")
    scheduler.shutdown()


app = FastAPI(
    title="Crontab Manager",
    description="A crontab-based script task management platform (SQLite-free)",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "version": "3.0.0",
        "docs": "/docs",
        "mode": "crontab (sqlite-free)",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
    )
