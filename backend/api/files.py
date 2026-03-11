"""File browser API routes."""
import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

router = APIRouter()


class FileItem(BaseModel):
    name: str
    path: str
    type: str  # 'file' or 'directory'
    size: Optional[int] = None
    is_executable: bool = False


class FileListResponse(BaseModel):
    current_path: str
    parent_path: Optional[str]
    items: List[FileItem]


def get_file_type(path: Path) -> str:
    """Get file type."""
    if path.is_dir():
        return "directory"
    return "file"


def is_executable(path: Path) -> bool:
    """Check if file is executable."""
    if path.is_file():
        return os.access(path, os.X_OK)
    return False


@router.get("/browse")
def browse_files(path: Optional[str] = None) -> FileListResponse:
    """
    Browse files and directories.
    
    Args:
        path: Directory path to browse. If None, uses user's home directory.
    
    Returns:
        List of files and directories.
    """
    # Default to home directory
    if path is None or path == "":
        target_path = Path.home()
    else:
        target_path = Path(path).expanduser().resolve()
    
    # Security: prevent directory traversal
    try:
        target_path.relative_to(Path.home())
    except ValueError:
        # Path is outside home, fallback to home
        target_path = Path.home()
    
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    
    if not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    # Get parent path
    parent_path = str(target_path.parent) if target_path != Path.home() else None
    
    # List items
    items = []
    try:
        for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            # Skip hidden files
            if item.name.startswith('.'):
                continue
            
            try:
                stat = item.stat()
                items.append(FileItem(
                    name=item.name,
                    path=str(item),
                    type=get_file_type(item),
                    size=stat.st_size if item.is_file() else None,
                    is_executable=is_executable(item)
                ))
            except (OSError, PermissionError):
                # Skip items we can't access
                continue
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    return FileListResponse(
        current_path=str(target_path),
        parent_path=parent_path,
        items=items
    )


@router.get("/home")
def get_home_directory() -> dict:
    """Get user's home directory."""
    return {
        "home": str(Path.home()),
        "username": Path.home().name
    }


@router.get("/validate")
def validate_path(path: str) -> dict:
    """
    Validate if a path exists and is accessible.
    
    Args:
        path: Path to validate.
    
    Returns:
        Validation result.
    """
    try:
        target = Path(path).expanduser().resolve()
        
        # Security check
        try:
            target.relative_to(Path.home())
            is_in_home = True
        except ValueError:
            is_in_home = False
        
        exists = target.exists()
        is_file = target.is_file() if exists else False
        is_dir = target.is_dir() if exists else False
        is_executable = os.access(target, os.X_OK) if is_file else False
        
        return {
            "path": str(target),
            "exists": exists,
            "is_file": is_file,
            "is_dir": is_dir,
            "is_executable": is_executable,
            "is_in_home": is_in_home,
            "valid": exists and is_file and is_executable
        }
    except Exception as e:
        return {
            "path": path,
            "exists": False,
            "valid": False,
            "error": str(e)
        }
