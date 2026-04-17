import os
from flask_sqlalchemy import SQLAlchemy
from app import app, db, SystemSettings
from sqlalchemy import text

def update_schema():
    with app.app_context():
        try:
            # Check if columns exist
            sql = text("ALTER TABLE system_settings ADD COLUMN portal_logo_bg VARCHAR(20) DEFAULT '#6366f1'")
            db.session.execute(sql)
            print("Columna portal_logo_bg agregada.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("La columna portal_logo_bg ya existe.")
            else:
                print(f"Error agregando portal_logo_bg: {e}")

        try:
            sql = text("ALTER TABLE system_settings ADD COLUMN portal_icon_color VARCHAR(20) DEFAULT '#ffffff'")
            db.session.execute(sql)
            print("Columna portal_icon_color agregada.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("La columna portal_icon_color ya existe.")
            else:
                print(f"Error agregando portal_icon_color: {e}")
        
        # Ensure at least one record exists
        settings = SystemSettings.query.first()
        if not settings:
            settings = SystemSettings()
            db.session.add(settings)
            print("Registro inicial de configuración creado.")
        
        db.session.commit()
        print("Esquema actualizado correctamente.")

if __name__ == "__main__":
    update_schema()
