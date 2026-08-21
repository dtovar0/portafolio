import os
import configparser
import jwt
from flask import Flask, g, request, redirect, url_for
from flask_wtf.csrf import CSRFProtect
from flask_talisman import Talisman
from models import db, User, SystemSettings
from utils_nexus import SecretManager

# Blueprint Imports
from routes.auth import auth_bp
from routes.catalog import catalog_bp
from routes.admin import admin_bp
from routes.api import api_bp

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

    # NEXUS_DATABASE_URI permite apuntar a otra base (pruebas aisladas)
    # sin tocar config.conf.
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'NEXUS_DATABASE_URI',
        f'mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = SECRET_KEY

    # Authelia (forward-auth). Ver utils_authelia.py para las implicaciones
    # de seguridad de confiar en headers.
    if os.path.exists(config_path):
        app.config['AUTHELIA_ENABLED'] = config.getboolean('AUTHELIA', 'ENABLED', fallback=False)
        app.config['AUTHELIA_TRUSTED_IPS'] = config.get('AUTHELIA', 'TRUSTED_IPS', fallback='')
        app.config['LOCAL_LOGIN_ENABLED'] = config.getboolean('AUTHELIA', 'LOCAL_LOGIN_FALLBACK', fallback=True)
    else:
        app.config['AUTHELIA_ENABLED'] = False
        app.config['AUTHELIA_TRUSTED_IPS'] = ''
        app.config['LOCAL_LOGIN_ENABLED'] = True

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
        g.user = None
        g.user_id = None
        g.role = None
        g.auth_source = None

        # Precedencia 1: Authelia. Si el proxy de confianza inyecta una
        # identidad válida, esa manda y se sincroniza el usuario local.
        from utils_authelia import read_identity, sync_user
        try:
            identity = read_identity()
        except Exception:
            identity = None

        if identity:
            try:
                user, _created = sync_user(identity)
                g.user = user
                g.user_id = user.id
                g.role = user.role
                g.auth_source = 'authelia'
                return
            except Exception:
                db.session.rollback()

        # Precedencia 2: JWT local (fallback). El rol se lee de la base, no
        # del token, para que un cambio de permisos surta efecto de inmediato.
        token = request.cookies.get('token')
        if token:
            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                user = User.query.get(data.get('user_id'))
                if user and user.status == 'Activo':
                    g.user = user
                    g.user_id = user.id
                    g.role = user.role
                    g.auth_source = 'local'
            except jwt.ExpiredSignatureError:
                pass
            except jwt.InvalidTokenError:
                pass
            except Exception:
                pass

    @app.context_processor
    def inject_globals():
        from models import SystemSettings, AccessRequest
        settings = SystemSettings.query.first() or SystemSettings()
        # Default placeholder if no settings record exists yet
        if not settings.id:
            settings.portal_name = "Nexus Access"
            
        pending_count = 0
        try:
            pending_count = AccessRequest.query.filter_by(status='Pendiente').count()
        except:
            pass

        from datetime import datetime
        return dict(
            current_user=g.user,
            portal_settings=settings,
            pending_requests_count=pending_count,
            now=datetime.utcnow()
        )

    # 5. Blueprints Registration
    app.register_blueprint(auth_bp)
    app.register_blueprint(catalog_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)

    # La API no usa formularios: la autenticación va por cookie JWT o por
    # headers de Authelia, así que el token CSRF de Flask-WTF no aplica.
    csrf.exempt(api_bp)

    # 6. Asset Serving (Framework standard)
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        from flask import send_from_directory
        return send_from_directory(os.path.join(app.root_path, 'assets'), filename)

    return app

if __name__ == '__main__':
    nexus_app = create_app()
    nexus_app.run(debug=True, port=5002)
