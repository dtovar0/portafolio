import os
import sys
from werkzeug.security import generate_password_hash

# Add current directory to path
sys.path.append(os.getcwd())

from app import create_app
from models import db, User

def reset_password(email, new_pass):
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"Error: User {email} not found")
            return False
        
        user.password_hash = generate_password_hash(new_pass)
        db.session.commit()
        print(f"Success: Password for {email} has been reset.")
        return True

if __name__ == "__main__":
    email = "dtovar@vivaro.com"
    new_pass = "Nexus2026!"
    if reset_password(email, new_pass):
        print(f"New password: {new_pass}")
