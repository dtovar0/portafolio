from app import db, app
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE system_settings ADD COLUMN db_ssl BOOLEAN DEFAULT FALSE"))
        db.session.commit()
        print("Misión cumplida: Columna db_ssl agregada.")
    except Exception as e:
        print(f"Error o ya existe: {e}")
