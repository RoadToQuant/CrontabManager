"""Initialize default settings."""
from models import SessionLocal, Setting, init_db


def init_default_settings():
    """Create default settings if none exist."""
    init_db()
    db = SessionLocal()
    
    try:
        # Check if settings exist
        count = db.query(Setting).count()
        if count > 0:
            print("Settings already initialized.")
            return
        
        default_settings = [
            {
                "key": "log_retention_days",
                "value": "30"
            },
            {
                "key": "max_log_size_mb",
                "value": "10"
            },
        ]
        
        for setting_data in default_settings:
            setting = Setting(**setting_data)
            db.add(setting)
        
        db.commit()
        print(f"Created {len(default_settings)} default settings.")
        
    finally:
        db.close()


if __name__ == "__main__":
    init_default_settings()
