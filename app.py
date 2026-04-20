import os
import configparser
import jwt
from flask import Flask, g, request, redirect, url_for
from flask_wtf.csrf import CSRFProtect
from flask_talisman import Talisman
from models import db, User
from utils_nexus import SecretManager

# Blueprint Imports
from routes.auth import auth_bp
from routes.catalog import catalog_bp
from routes.admin import admin_bp

def create_app():
    app = Flask(__name__)
    csrf = CSRFProtect(app)

    # 1. Configuration Loading
    config = configparser.ConfigParser()
    config_path = os.path.join(os.path.dirname(__file__), 'config.conf')
    
    if os.path.exists(config_path):
        config.read(config_path, encoding='utf-8')
        DB_USER = config.get('DATABASE', 'DB_USER', fallback='root')
        DB_PASS = config.get('DATABASE', 'DB_PASS', fallback='')
        DB_HOST = config.get('DATABASE', 'DB_HOST', fallback='localhost')
        DB_NAME = config.get('DATABASE', 'DB_NAME', fallback='nexus')
        SECRET_KEY = config.get('SYSTEM', 'SECRET_KEY', fallback='dev-key-nexus-2026')
        DEBUG_MODE = config.getboolean('SYSTEM', 'DEBUG', fallback=True)
    else:
        DB_USER, DB_PASS, DB_HOST, DB_NAME = 'root', '', 'localhost', 'nexus'
        SECRET_KEY, DEBUG_MODE = 'dev-key-nexus-2026', True

    app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = SECRET_KEY

    # 2. Security Configuration (Talisman)
    Talisman(app, 
             force_https=False, 
             content_security_policy={
                 'default-src': ["'self'"],
                 'script-src': [
                     "'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net",
                     "https://fonts.googleapis.com", "'sha256-UmUbmwJY/eI7w6JFxeSQCKE3TUH8gR6XHveyIa5lpsw='",
                     "'sha256-/gM1+5EIuECgx0tU5GpKBJHycnynoI/aIDWGytpMNL4='",
                     "'sha256-YTrEuDh8cwArA/Wswxr1QUIdxTsKT2YfHoaP2y0sYq4='",
                     "'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='",
                     "'sha256-UmUbmwJY/eI7w6JFxeSQCKE3TUH8gR6XHveyIa5lpsw='"
                 ],
                 'style-src': [
                     "'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", 
                     "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"
                 ],
                 'img-src': ["'self'", "data:", "*"],
                 'font-src': ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                 'connect-src': ["'self'"]
             },
             content_security_policy_nonce_in=['script-src']
    )

    # 3. Extensions Initialization
    db.init_app(app)

    # 4. Request Hooks & Processors
    @app.before_request
    def load_user():
        token = request.cookies.get('token')
        g.user = None
        g.user_id = None
        g.role = None
        if token:
            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                g.user_id = data.get('user_id')
                g.role = data.get('role')
                g.user = User.query.get(g.user_id)
            except:
                pass

    @app.context_processor
    def inject_user():
        return dict(current_user=g.user)

    # 5. Blueprints Registration
    app.register_blueprint(auth_bp)
    app.register_blueprint(catalog_bp)
    app.register_blueprint(admin_bp)

    # 6. Asset Serving (Framework standard)
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        from flask import send_from_directory
        return send_from_directory(os.path.join(app.root_path, 'assets'), filename)

    return app

if __name__ == '__main__':
    nexus_app = create_app()
    nexus_app.run(debug=True, port=5002)
