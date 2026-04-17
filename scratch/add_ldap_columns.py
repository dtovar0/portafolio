from app import db, app
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE system_settings ADD COLUMN ldap_use_ssl BOOLEAN DEFAULT FALSE"))
        db.session.execute(text("ALTER TABLE system_settings ADD COLUMN ldap_user_attribute VARCHAR(50) DEFAULT 'uid'"))
        db.session.commit()
        print("Misión cumplida: Columnas LDAP agregadas.")
    except Exception as e:
        print(f"Error o ya existen: {e}")
