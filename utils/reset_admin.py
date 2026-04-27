import os
import sys
import configparser
from werkzeug.security import generate_password_hash

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import create_app
    from models import db, User
except ImportError as e:
    print(f"Error: No se pudo importar los módulos necesarios. {e}")
    sys.exit(1)

def reset_admin_password():
    app = create_app()
    with app.app_context():
        print("--- Reset de Contraseña de Administrador ---")
        email = input("Introduce el email del administrador (ej: admin@nexus.local): ").strip()
        
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"Error: No se encontró ningún usuario con el email {email}")
            return
            
        if user.role != 'Administrador':
            confirm = input(f"Advertencia: El usuario {user.name} no tiene rol de Administrador (es {user.role}). ¿Deseas continuar? (s/n): ")
            if confirm.lower() != 's':
                print("Operación cancelada.")
                return

        new_password = input("Introduce la nueva contraseña: ").strip()
        if len(new_password) < 6:
            print("Error: La contraseña debe tener al menos 6 caracteres.")
            return

        user.password_hash = generate_password_hash(new_password)
        try:
            db.session.commit()
            print(f"¡Éxito! La contraseña de {user.name} ha sido actualizada.")
        except Exception as e:
            db.session.rollback()
            print(f"Error al guardar los cambios en la base de datos: {e}")

if __name__ == "__main__":
    reset_admin_password()
