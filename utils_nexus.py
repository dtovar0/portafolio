import os
import jwt
from functools import wraps
from flask import request, redirect, url_for, g
from cryptography.fernet import Fernet
from models import User

class SecretManager:
    _key_file = 'secret.key'
    _key = None

    @classmethod
    def get_key(cls):
        if not cls._key:
            if os.path.exists(cls._key_file):
                with open(cls._key_file, 'rb') as f:
                    cls._key = f.read()
            else:
                cls._key = Fernet.generate_key()
                with open(cls._key_file, 'wb') as f:
                    f.write(cls._key)
        return cls._key

    @classmethod
    def encrypt(cls, value):
        if not value: return None
        f = Fernet(cls.get_key())
        return f.encrypt(value.encode()).decode()

    @classmethod
    def decrypt(cls, encrypted_value):
        if not encrypted_value: return None
        f = Fernet(cls.get_key())
        try:
            return f.decrypt(encrypted_value.encode()).decode()
        except:
            return encrypted_value

def require_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        public_endpoints = ['auth.login', 'static', 'auth.web_installer']
        user_endpoints = ['catalog.index', 'auth.logout', 'catalog.submit_request']
        
        # Identification is already done in app.before_request if we want to share g.user
        if not g.user:
            return redirect(url_for('auth.login'))
            
        if g.role != 'Administrador' and request.endpoint not in user_endpoints:
            return redirect(url_for('catalog.index'))
            
        return f(*args, **kwargs)
    return decorated_function
