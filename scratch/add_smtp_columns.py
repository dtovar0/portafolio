from app import db, app
from sqlalchemy import text

with app.app_context():
    try:
        # Check if they exist to avoid errors
        db.session.execute(text("ALTER TABLE system_settings ADD COLUMN smtp_auth BOOLEAN DEFAULT TRUE"))
        db.session.execute(text("ALTER TABLE system_settings ADD COLUMN smtp_from_name VARCHAR(100) DEFAULT 'Nexus Access'"))
        db.session.execute(text("ALTER TABLE system_settings ADD COLUMN smtp_from_email VARCHAR(100)"))
        db.session.commit()
        print("Misión cumplida: Columnas SMTP agregadas.")
    except Exception as e:
        print(f"Error o ya existen: {e}")
