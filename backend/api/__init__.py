"""API routes."""
from fastapi import APIRouter

from api import tasks, logs, editor, executors, settings, files, templates

api_router = APIRouter()

api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(editor.router, prefix="/tasks", tags=["editor"])
api_router.include_router(executors.router, prefix="/executors", tags=["executors"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
