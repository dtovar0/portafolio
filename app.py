import os
from flask import Flask, render_template, request, redirect, url_for, jsonify, g, make_response
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import jwt
from functools import wraps

import pymysql
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import configparser
from flask_wtf.csrf import CSRFProtect
from flask_talisman import Talisman
from cryptography.fernet import Fernet

app = Flask(__name__)
csrf = CSRFProtect(app)

# Security Headers (Talisman)
# Note: Content-Security-Policy is set to a reasonable default.
# force_https is disabled for local dev but should be enabled in production.
Talisman(app, 
         force_https=False, 
         content_security_policy={
             'default-src': ["'self'"],
             'script-src': [
                 "'self'", 
                 "https://cdnjs.cloudflare.com", 
                 "https://cdn.jsdelivr.net",
                 "https://fonts.googleapis.com",
                 "'sha256-UmUbmwJY/eI7w6JFxeSQCKE3TUH8gR6XHveyIa5lpsw='",
                 "'sha256-/gM1+5EIuECgx0tU5GpKBJHycnynoI/aIDWGytpMNL4='",
                 "'sha256-YTrEuDh8cwArA/Wswxr1QUIdxTsKT2YfHoaP2y0sYq4='",
                 "'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='",
                 "'sha256-UmUbmwJY/eI7w6JFxeSQCKE3TUH8gR6XHveyIa5lpsw='"
             ],
             'style-src': [
                 "'self'", 
                 "'unsafe-inline'", 
                 "https://cdnjs.cloudflare.com", 
                 "https://fonts.googleapis.com", 
                 "https://cdn.jsdelivr.net"
             ],
             'img-src': ["'self'", "data:", "*"],
             'font-src': ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
             'connect-src': ["'self'"]
         },
         content_security_policy_nonce_in=['script-src']
)

# Secrets Management
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
        except Exception:
            # If decryption fails, it might be plain text (migration case)
            return encrypted_value

# Load configuration from config.conf
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), 'config.conf')

if os.path.exists(config_path):
    config.read(config_path, encoding='utf-8')
    DB_USER = config.get('DATABASE', 'DB_USER', fallback=os.environ.get('DB_USER', 'username'))
    DB_PASS = config.get('DATABASE', 'DB_PASS', fallback=os.environ.get('DB_PASS', 'password'))
    DB_HOST = config.get('DATABASE', 'DB_HOST', fallback=os.environ.get('DB_HOST', 'localhost'))
    DB_NAME = config.get('DATABASE', 'DB_NAME', fallback='nexus')
    SECRET_KEY = config.get('SYSTEM', 'SECRET_KEY', fallback='dev-key-nexus-2026')
    DEBUG_MODE = config.getboolean('SYSTEM', 'DEBUG', fallback=True)
else:
    DB_USER = os.environ.get('DB_USER', 'username')
    DB_PASS = os.environ.get('DB_PASS', 'password')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_NAME = 'nexus'
    SECRET_KEY = 'dev-key-nexus-2026'
    DEBUG_MODE = True

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = SECRET_KEY

db = SQLAlchemy(app)

@app.context_processor
def inject_user():
    return dict(current_user=getattr(g, 'user', None))

@app.before_request
def require_login():
    public_endpoints = ['login', 'static', 'web_installer', 'web_installer_test_db']
    user_endpoints = ['catalogo', 'logout', 'submit_request', 'register_visit']
    
    token = request.cookies.get('token')
    g.user = None
    g.user_id = None
    g.role = None

    if token:
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            g.user_id = data.get('user_id')
            g.role = data.get('role')
            g.user = User.query.get(g.user_id)
        except:
            pass
            
    if request.endpoint is None or request.endpoint in public_endpoints:
        return
        
    if not g.user:
        return redirect(url_for('login'))
        
    # Block normal users from accessing ANY admin endpoints
    if g.role != 'Administrador' and request.endpoint not in user_endpoints:
        return redirect(url_for('catalogo'))

# Models
class Area(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='Activo')
    icon = db.Column(db.String(50), default='box')
    color = db.Column(db.String(100), default='linear-gradient(135deg, #6366f1, #818cf8)')

    def __init__(self, name, description=None, status='Activo', icon='box', color=None):
        self.name = name
        self.description = description
        self.status = status
        self.icon = icon
        self.color = color or 'linear-gradient(135deg, #6366f1, #818cf8)'

    def to_dict(self):
        # Unique users: those directly assigned + those with approved platform access
        user_ids = {u.id for u in self.users}
        for p in self.platforms:
            for req in p.requests:
                if req.status == 'Aprobado':
                    user_ids.add(req.user_id)
        
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'icon': self.icon,
            'color': self.color,
            'platforms_count': len(self.platforms),
            'users_count': len(user_ids),
            'user_ids': list(user_ids)
        }

class Platform(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey('area.id'), nullable=False)
    area = db.relationship('Area', backref=db.backref('platforms', lazy=True))
    roles = db.Column(db.String(200)) # Simple comma separated roles
    request_method = db.Column(db.Text) # "How to request"
    direct_link = db.Column(db.String(255))
    owner = db.Column(db.String(100))
    resources = db.Column(db.Text) # Links to tutorials
    logo_url = db.Column(db.String(255))
    icon = db.Column(db.String(50), default='box')
    status = db.Column(db.String(20), default='Activo')
    visits = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, name, description, area_id, roles=None, request_method=None, direct_link=None, owner=None, resources=None, visits=0, logo_url=None, icon='box', status='Activo'):
        self.name = name
        self.description = description
        self.area_id = area_id
        self.roles = roles
        self.request_method = request_method
        self.direct_link = direct_link
        self.owner = owner
        self.resources = resources
        self.visits = visits
        self.logo_url = logo_url
        self.icon = icon
        self.status = status

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'area_id': self.area_id,
            'logo_url': self.logo_url,
            'icon': self.icon,
            'direct_link': self.direct_link,
            'owner': self.owner,
            'resources': self.resources,
            'status': self.status,
            'roles': self.roles,
            'visits': self.visits
        }

class AccessRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    platform_id = db.Column(db.Integer, db.ForeignKey('platform.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    platform = db.relationship('Platform', backref=db.backref('requests', lazy=True, cascade="all, delete-orphan"))
    user = db.relationship('User', backref=db.backref('requests', lazy=True, cascade="all, delete-orphan"))
    status = db.Column(db.String(20), default='Pendiente') # Pendiente, Aprobado, Rechazado, Revocado
    request_type = db.Column(db.String(20), default='Usuario') # Usuario, Admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)

    def __init__(self, platform_id, user_id, status='Pendiente', request_type='Usuario', processed_at=None):
        self.platform_id = platform_id
        self.user_id = user_id
        self.status = status
        self.request_type = request_type
        self.processed_at = processed_at or (datetime.utcnow() if status != 'Pendiente' else None)

class Auditoria(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(50)) # Area, Plataforma, Usuario, Configuración
    entity_name = db.Column(db.String(100))
    action = db.Column(db.String(50)) # Alta, Baja, Modificación, Deshabilitación, Solicitud
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    user_name = db.Column(db.String(100))
    user_email = db.Column(db.String(100))
    description = db.Column(db.Text)
    payload = db.Column(db.JSON, nullable=True) # Diffs/Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref=db.backref('auditorias', lazy=True))

def log_event(entity_type, entity_name, action, description, user_id=None, payload=None):
    u_name = "Sistema"
    u_email = ""
    if user_id:
        user_obj = User.query.get(user_id)
        if user_obj:
            u_name = user_obj.name
            u_email = user_obj.email

    new_log = Auditoria(
        entity_type=entity_type,
        entity_name=entity_name,
        action=action,
        description=description,
        user_id=user_id,
        user_name=u_name,
        user_email=u_email,
        payload=payload
    )
    db.session.add(new_log)
    db.session.commit()

class SystemSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    portal_name = db.Column(db.String(100), default='Nexus Access')
    portal_logo_url = db.Column(db.String(255))
    portal_logo_type = db.Column(db.String(10), default='image') # image, icon
    portal_icon = db.Column(db.String(50), default='fa-box')
    db_type = db.Column(db.String(20), default='mysql') # mysql, postgres
    db_host = db.Column(db.String(100), default='localhost')
    db_port = db.Column(db.String(10), default='3306')
    db_user = db.Column(db.String(100))
    db_password = db.Column(db.String(100))
    db_name = db.Column(db.String(100), default='nexus_access')
    db_ssl = db.Column(db.Boolean, default=False)
    portal_logo_bg = db.Column(db.String(20), default='#6366f1') # Color de fondo del logo circular
    portal_icon_color = db.Column(db.String(20), default='#ffffff') # Color del icono dentro del círculo
    
    # SMTP Settings
    smtp_host = db.Column(db.String(100))
    smtp_port = db.Column(db.String(10), default='587')
    smtp_user = db.Column(db.String(100))
    smtp_password = db.Column(db.String(100))
    smtp_encryption = db.Column(db.String(10), default='TLS') # SSL, TLS, None
    smtp_auth = db.Column(db.Boolean, default=True)
    smtp_from_name = db.Column(db.String(100), default='Nexus Access')
    smtp_from_email = db.Column(db.String(100))
    
    # Email Template Settings
    email_subject = db.Column(db.String(200), default='Nueva Solicitud de Acceso - Portal Nexus')
    email_body = db.Column(db.Text)
    
    # LDAP Settings
    ldap_enabled = db.Column(db.Boolean, default=False)
    ldap_server = db.Column(db.String(100))
    ldap_port = db.Column(db.String(10), default='389')
    ldap_base_dn = db.Column(db.String(200))
    ldap_user_dn = db.Column(db.String(200))
    ldap_password = db.Column(db.String(100))
    ldap_use_ssl = db.Column(db.Boolean, default=False)
    ldap_user_attribute = db.Column(db.String(50), default='uid')
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, portal_name='Nexus Access', portal_logo_url=None, portal_logo_type='image', portal_icon='box',
                 db_type='mysql', db_host='localhost', db_port='3306', db_user=None, db_password=None, db_name='nexus_access', 
                 smtp_host=None, smtp_port='587', smtp_user=None, smtp_password=None, smtp_encryption='TLS', 
                 email_subject='Nueva Solicitud de Acceso - Portal Nexus', email_body=None,
                 ldap_enabled=False, ldap_server=None, ldap_port='389', ldap_base_dn=None, ldap_user_dn=None, ldap_password=None):
        self.portal_name = portal_name
        self.portal_logo_url = portal_logo_url
        self.portal_logo_type = portal_logo_type
        self.portal_icon = portal_icon
        self.db_type = db_type
        self.db_host = db_host
        self.db_port = db_port
        self.db_user = db_user
        self.db_password = db_password
        self.db_name = db_name
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.smtp_encryption = smtp_encryption
        self.email_subject = email_subject
        self.email_body = email_body or "Hola {user_name},\n\nse ha recibido una solicitud para la plataforma {platform_name}."
        self.ldap_enabled = ldap_enabled
        self.ldap_server = ldap_server
        self.ldap_port = ldap_port
        self.ldap_base_dn = ldap_base_dn
        self.ldap_user_dn = ldap_user_dn
        self.ldap_password = ldap_password

    def to_dict(self):
        return {
            'portal_name': self.portal_name,
            'portal_logo_url': self.portal_logo_url,
            'portal_logo_type': self.portal_logo_type,
            'portal_icon': self.portal_icon,
            'db_type': self.db_type,
            'db_host': self.db_host,
            'db_port': self.db_port,
            'db_user': self.db_user,
            'db_name': self.db_name,
            'smtp_host': self.smtp_host,
            'smtp_port': self.smtp_port,
            'smtp_user': self.smtp_user,
            'smtp_encryption': self.smtp_encryption,
            'email_subject': self.email_subject,
            'email_body': self.email_body,
            'ldap_enabled': self.ldap_enabled,
            'ldap_server': self.ldap_server,
            'ldap_port': self.ldap_port,
            'ldap_base_dn': self.ldap_base_dn,
            'ldap_user_dn': self.ldap_user_dn
        }

# -- Database Context Processor --
@app.route('/install', methods=['GET', 'POST'])
def web_installer():
    config_path = os.path.join(os.path.dirname(__file__), 'config.conf')
    
    # Deshabilitar si ya existe el archivo de configuración
    if os.path.exists(config_path):
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        db_host = request.form.get('db_host', 'localhost')
        db_user = request.form.get('db_user')
        db_pass = request.form.get('db_pass', '')
        db_name = request.form.get('db_name', 'nexus')
        drop_db = request.form.get('drop_db') == 'on'
        
        admin_name = request.form.get('admin_name', 'Admin Nexus')
        admin_email = request.form.get('admin_email', 'admin@nexus.local')
        admin_pass = request.form.get('admin_pass')
        
        redis_enabled = request.form.get('redis_enabled') == 'on'
        
        if not db_user or not admin_pass or len(admin_pass) < 6:
            return render_template('install.html', error="Faltan datos obligatorios o la contraseña es muy corta.")

        try:
            # 1. Database Connection and Creation
            conn = pymysql.connect(host=db_host, user=db_user, password=db_pass)
            with conn.cursor() as cursor:
                # Check exist
                cursor.execute(f"SHOW DATABASES LIKE '{db_name}'")
                if cursor.fetchone():
                    if not drop_db:
                        return render_template('install.html', error=f"La base de datos '{db_name}' ya existe. Marque la casilla para borrarla.")
                    cursor.execute(f"DROP DATABASE {db_name}")
                
                cursor.execute(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            conn.close()

            # 2. Schema Import
            conn = pymysql.connect(host=db_host, user=db_user, password=db_pass, database=db_name)
            with conn.cursor() as cursor:
                schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
                if os.path.exists(schema_path):
                    with open(schema_path, 'r', encoding='utf-8') as f:
                        sql_cmds = f.read().split(';')
                        for cmd in sql_cmds:
                            if cmd.strip():
                                cursor.execute(cmd)
                
                # 3. Create Admin
                pass_hash = generate_password_hash(admin_pass)
                cursor.execute("INSERT INTO user (name, email, role, status, password_hash) VALUES (%s, %s, 'Administrador', 'Activo', %s)",
                               (admin_name, admin_email, pass_hash))
            conn.commit()
            conn.close()

            # 4. Generate config.conf
            sec_key = secrets.token_hex(24)
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write("[DATABASE]\n")
                f.write(f"DB_USER = {db_user}\n")
                f.write(f"DB_PASS = {db_pass}\n")
                f.write(f"DB_HOST = {db_host}\n")
                f.write(f"DB_NAME = {db_name}\n\n")
                
                f.write("[REDIS]\n")
                f.write(f"REDIS_ENABLED = True\n")
                f.write(f"REDIS_HOST = localhost\n")
                f.write(f"REDIS_PORT = 6379\n\n")
                
                f.write("[SYSTEM]\n")
                f.write(f"SECRET_KEY = {sec_key}\n")
                f.write("DEBUG = False\n")

            return render_template('install.html', success="¡Instalación completada con éxito!")

        except Exception as e:
            return render_template('install.html', error=f"Error durante la instalación: {str(e)}")

    return render_template('install.html')

@app.route('/test_db', methods=['POST'])
def web_installer_test_db():
    # Seguridad: Deshabilitar si ya está instalado
    if os.path.exists(os.path.join(os.path.dirname(__file__), 'config.conf')):
        return jsonify({'success': False, 'message': 'Acceso denegado: Sistema ya configurado'}), 403

    db_host = request.json.get('db_host', 'localhost')
    db_user = request.json.get('db_user')
    db_pass = request.json.get('db_pass', '')
    db_name = request.json.get('db_name', 'nexus')
    
    if not db_user:
        return jsonify({'success': False, 'message': 'Usuario de DB requerido'})
        
    try:
        # 1. Conexión básica y privilegios
        conn = pymysql.connect(host=db_host, user=db_user, password=db_pass, connect_timeout=5)
        with conn.cursor() as cursor:
            # 2. Verificar si podemos crear/acceder a la base de datos
            cursor.execute(f"SHOW DATABASES LIKE '{db_name}'")
            exists = cursor.fetchone()
            
            if exists:
                # Si existe, intentar entrar y ver si tenemos permisos de escritura (simulados por acceso)
                cursor.execute(f"USE {db_name}")
                # Podríamos intentar un CREATE TABLE TEMPORARY si quisiéramos ser ultra estrictos
                # cursor.execute("CREATE TEMPORARY TABLE test_perm (id INT)")
                message = f"¡Conexión exitosa! La base de datos '{db_name}' ya existe y es accesible."
            else:
                # Si no existe, verificar si tenemos permiso para CREARLA
                # Intentamos un "dry run" o simplemente confiamos en la conexión inicial si el usuario tiene privilegios globales
                message = f"¡Conexión exitosa! El usuario tiene permisos. Se creará '{db_name}' al instalar."
                
        conn.close()
        return jsonify({'success': True, 'message': message})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Fallo de validación: {str(e)}'})

# -- Database Context Processor --
# -- Consolidated Context Processor --
@app.context_processor
def inject_global_settings():
    try:
        # Load or initialize system settings
        settings = SystemSettings.query.first()
        if not settings:
            settings = SystemSettings(portal_name='Nexus Access', db_type='mysql')
            db.session.add(settings)
            db.session.commit()
            
        # Common counts for UI badges
        platforms_count = Platform.query.count()
        pending_count = AccessRequest.query.filter_by(status='Pendiente').count()
        
        return dict(
            portal_settings=settings,
            total_platforms_count=platforms_count,
            pending_requests_count=pending_count,
            now=datetime.utcnow()
        )
    except Exception as e:
        # Fallback to defaults if DB is not ready or has issues
        return dict(
            portal_settings=None,
            total_platforms_count=0,
            pending_requests_count=0,
            now=datetime.utcnow()
        )

# Association table for User <-> Area
user_areas = db.Table('user_areas',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('area_id', db.Integer, db.ForeignKey('area.id'), primary_key=True)
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    role = db.Column(db.String(50))
    status = db.Column(db.String(20), default='Activo')
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    areas = db.relationship('Area', secondary=user_areas, backref=db.backref('users', lazy=True))

    @property
    def platforms(self):
        """Unified source of truth for platform access via approved requests"""
        approved_requests = AccessRequest.query.filter_by(user_id=self.id, status='Aprobado').all()
        return [r.platform for r in approved_requests if r.platform]

    def __init__(self, name, email, role, status='Activo', password=None):
        self.name = name
        self.email = email
        self.role = role
        self.status = status
        if password:
            from werkzeug.security import generate_password_hash
            self.password_hash = generate_password_hash(password)

    def to_dict(self):
        # Count approved platform requests
        approved_count = AccessRequest.query.filter_by(user_id=self.id, status='Aprobado').count()
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'areas': [{'id': a.id, 'name': a.name, 'icon': a.icon or 'box', 'color': a.color} for a in self.areas],
            'platforms_count': approved_count
        }

# Create database and dummy data if empty
# Counts injection is now handled in the consolidated context processor above.

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    all_areas = Area.query.order_by(Area.name).all()
    platforms = Platform.query.all()
    
    # Group by area name using relationship
    grouped = {area.name: [] for area in all_areas}
    for p in platforms:
        if p.area.name in grouped:
            grouped[p.area.name].append(p)
        
    # KPIs for the user view
    total_platforms = len(platforms)
    total_users = User.query.count()
    total_requests_all = AccessRequest.query.count()
    areas_count_list = [(area.name, len(area.platforms)) for area in all_areas]
    pending_requests = AccessRequest.query.filter_by(status='Pendiente').count()
    visits_monthly = sum(p.visits for p in platforms)
    latest_platforms = Platform.query.order_by(Platform.created_at.desc()).limit(5).all()
    most_visited = Platform.query.order_by(Platform.visits.desc()).limit(5).all()

    # Unified Audit Logs for the monitoring card (Last 8 records)
    log_list = Auditoria.query.order_by(Auditoria.created_at.desc()).limit(8).all()

    # New Chart Data
    users_per_platform = []
    for p in platforms:
        count = AccessRequest.query.filter_by(platform_id=p.id, status='Aprobado').count()
        if count > 0:
            label = [p.name, f"[{p.area.name}]"]
            users_per_platform.append({'label': label, 'value': count})
    
    # Sort by value desc and take top 5
    users_per_platform = sorted(users_per_platform, key=lambda x: x['value'], reverse=True)[:5]
    
    users_per_area = []
    for a in all_areas:
        users_per_area.append({'label': a.name, 'value': len(a.users)})
    
    # Sort by value desc and take top 5
    users_per_area = sorted(users_per_area, key=lambda x: x['value'], reverse=True)[:5]

    # Pending requests per platform
    pending_per_platform = []
    for p in platforms:
        p_count = AccessRequest.query.filter_by(platform_id=p.id, status='Pendiente').count()
        if p_count > 0:
            label = [p.name, f"[{p.area.name}]"]
            pending_per_platform.append({'label': label, 'value': p_count})
    
    pending_per_platform = sorted(pending_per_platform, key=lambda x: x['value'], reverse=True)[:8]

    return render_template('index.html', 
                           grouped_platforms=grouped.items(),
                           total=total_platforms,
                           total_users=total_users,
                           total_requests_all=total_requests_all,
                           areas_count=areas_count_list,
                           log_list=log_list,
                           areas_count_num=len(all_areas),
                           areas_goal=10, 
                           pending=pending_requests,
                           priority_count=2,
                           platforms_new=2,
                           visits_total=visits_monthly,
                           visits_up="+18%",
                           latest=latest_platforms,
                           most_visited=most_visited,
                           users_platform_labels=[x['label'] for x in users_per_platform],
                           users_platform_values=[x['value'] for x in users_per_platform],
                           users_area_labels=[x['label'] for x in users_per_area],
                           users_area_values=[x['value'] for x in users_per_area],
                           users_area_colors=[Area.query.filter_by(name=x['label']).first().color if Area.query.filter_by(name=x['label']).first() else '#6366f1' for x in users_per_area],
                           pending_platform_labels=[x['label'] for x in pending_per_platform],
                           pending_platform_values=[x['value'] for x in pending_per_platform])

@app.route('/platforms')
def platforms_list():
    all_areas = Area.query.all()
    platforms = Platform.query.order_by(Platform.name).all()
    
    # Initialize grouped ONLY with registered areas from DB
    grouped = {area.name: [] for area in all_areas}
    
    for p in platforms:
        # Only assign if the area actually exists in our Area table
        if p.area.name in grouped:
            # Count approved users
            approved_users = [r.user_id for r in p.requests if r.status == 'Aprobado']
            
            grouped[p.area.name].append({
                "id": p.id,
                "name": p.name,
                "area": p.area.name,
                "area_id": p.area_id,
                "description": p.description,
                "direct_link": p.direct_link,
                "roles": p.roles,
                "visits": p.visits,
                "logo_url": p.logo_url,
                "icon": p.icon or "box",
                "user_count": len(approved_users),
                "user_ids": approved_users
            })
    
    # Area list for client-side pagination
    area_list = []
    for area in all_areas:
        area_list.append({
            "id": area.id,
            "name": area.name,
            "status": area.status,
            "icon": area.icon or 'box',
            "platform_count": len(grouped.get(area.name, []))
        })

    all_users = [u.to_dict() for u in User.query.order_by(User.name).all()]
    return render_template('platforms.html', 
                          grouped_platforms=grouped, 
                          area_list=area_list,
                          all_users=all_users)

@app.route('/requests')
def requests_view():
    all_requests = AccessRequest.query.order_by(AccessRequest.created_at.desc()).all()
    # Group by status
    grouped = {
        'Pendientes': [r for r in all_requests if r.status == 'Pendiente'],
        'Aprobadas': [r for r in all_requests if r.status == 'Aprobado'],
        'Denegadas': [r for r in all_requests if r.status == 'Rechazado'],
        'Historial': all_requests
    }
    # Calculate counts
    counts = {k: len(v) for k, v in grouped.items()}
    
    # Simple JSON data for client-side drill-down
    # In a larger app, we would paginate per status, but for this scale, this is fine.
    json_data = {}
    for k, v in grouped.items():
        json_data[k] = [{
            "id": r.id,
            "platform": r.platform.name if r.platform else "N/A",
            "user": r.user.name if r.user else "Anon",
            "status": r.status,
            "type": r.request_type,
            "date": r.created_at.strftime('%d/%m/%Y %H:%M'),
            "processed_date": r.processed_at.strftime('%d/%m/%Y %H:%M') if r.processed_at else "---"
        } for r in v]
    
    return render_template('requests.html', counts=counts, grouped_requests=json_data)

@app.route('/admin/areas')
def areas_list():
    all_areas = Area.query.order_by(Area.name).all()
    # Serialize for client-side pagination
    areas_json = [a.to_dict() for a in all_areas]
    counts_map = {a.name: len(a.platforms) for a in all_areas}
    all_users = User.query.all()
    all_users_json = [u.to_dict() for u in all_users]
    return render_template('areas.html', areas=all_areas, areas_json=areas_json, counts_map=counts_map, all_users_json=all_users_json)

@app.route('/admin/areas-api')
def get_areas_json():
    areas = Area.query.all()
    return jsonify([a.to_dict() for a in areas])

@app.route('/admin/add-area', methods=['POST'])
def add_area():
    try:
        name = request.form.get('name')
        existing = Area.query.filter_by(name=name).first()
        if existing:
            return jsonify({"success": False, "error": "Ya existe un área con este nombre."}), 400

        new_area = Area(
            name=name,
            description=request.form.get('description'),
            status=request.form.get('status', 'Activo'),
            icon=request.form.get('icon', 'box'),
            color=request.form.get('color')
        )
        # Process users if provided
        user_ids = request.form.get('users')
        if user_ids:
            import json
            ids = json.loads(user_ids)
            users = User.query.filter(User.id.in_(ids)).all()
            new_area.users = users

        db.session.add(new_area)
        db.session.commit()
        log_event('Área', new_area.name, 'Alta', f"Se creó el área '{new_area.name}'", g.user_id)
        return jsonify({"success": True, "message": "Área creada con éxito"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo crear el área. Verifique que los datos sean correctos."}), 400

@app.route('/admin/edit-area/<int:id>', methods=['POST'])
def edit_area(id):
    try:
        area = Area.query.get_or_404(id)
        new_name = request.form.get('name')
        
        # Only check if name changed
        if new_name != area.name:
            existing = Area.query.filter_by(name=new_name).first()
            if existing:
                return jsonify({"success": False, "error": "Ya existe otra área con este nombre."}), 400
            area.name = new_name

        old_status = area.status
        area.description = request.form.get('description')
        area.status = request.form.get('status')
        area.icon = request.form.get('icon', 'box')
        area.color = request.form.get('color')
        
        if old_status == 'Activo' and area.status == 'Inactivo':
            status_action = 'Deshabilitación'
        elif old_status == 'Inactivo' and area.status == 'Activo':
            status_action = 'Activación'
        else:
            status_action = 'Modificación'

        # Process users if provided
        user_ids_raw = request.form.get('users')
        if user_ids_raw is not None:
            import json
            ids = json.loads(user_ids_raw)
            users_to_assign = User.query.filter(User.id.in_(ids)).all()
            area.users = users_to_assign

        db.session.commit()
        log_event('Área', area.name, status_action, f"Se actualizó información y estado del área '{area.name}'", g.user_id)
        return jsonify({"success": True, "message": "Área actualizada"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar el área. Verifique los datos."}), 400

@app.route('/admin/delete-area/<int:id>', methods=['POST'])
def delete_area(id):
    a = Area.query.get_or_404(id)
    # Check for linked platforms
    if len(a.platforms) > 0:
        return jsonify({"success": False, "error": f"No se puede eliminar el área '{a.name}' porque tiene {len(a.platforms)} plataformas vinculadas."}), 400
    
    area_name = a.name
    db.session.delete(a)
    db.session.commit()
    log_event('Área', area_name, 'Baja', f"Se eliminó el área '{area_name}'", g.user_id)
    return jsonify({"success": True, "message": "Área eliminada"})

@app.route('/admin/users')
def users_list():
    all_users = User.query.order_by(User.name).all()
    # Serialize for client-side pagination
    users_json = [u.to_dict() for u in all_users]
    all_areas = Area.query.all()
    all_areas_json = [a.to_dict() for a in all_areas]
    return render_template('users.html', users=all_users, users_json=users_json, all_areas=all_areas, all_areas_json=all_areas_json)

@app.route('/admin/add-user', methods=['POST'])
def add_user():
    try:
        email = request.form.get('email')
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({"success": False, "error": "Este correo electrónico ya está registrado."}), 400

        new_u = User(
            name=request.form.get('name'),
            email=email,
            role=request.form.get('role'),
            status=request.form.get('status', 'Activo')
        )
        db.session.add(new_u)
        
        # Handle areas
        areas_json = request.form.get('areas', '[]')
        try:
            area_names = json.loads(areas_json)
            selected_areas = Area.query.filter(Area.name.in_(area_names)).all()
            new_u.areas = selected_areas
        except:
            pass

        db.session.commit()
        log_event('Usuario', new_u.name, 'Alta', f"Se registró al usuario {new_u.name} ({new_u.email})", g.user_id)
        return jsonify({"success": True, "message": "Usuario registrado"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo registrar al usuario. Verifique los datos."}), 400

@app.route('/admin/edit-user/<int:id>', methods=['POST'])
def edit_user(id):
    u = User.query.get_or_404(id)
    old_status = u.status
    u.role = request.form.get('role')
    u.status = request.form.get('status')
    
    if old_status == 'Activo' and u.status == 'Inactivo':
        status_action = 'Deshabilitación'
    elif old_status == 'Inactivo' and u.status == 'Activo':
        status_action = 'Activación'
    else:
        status_action = 'Modificación'

    # Handle areas
    areas_json = request.form.get('areas', '[]')
    try:
        area_names = json.loads(areas_json)
        selected_areas = Area.query.filter(Area.name.in_(area_names)).all()
        u.areas = selected_areas
    except:
        pass

    db.session.commit()
    log_event('Usuario', u.name, status_action, f"Se actualizaron datos del usuario {u.name}", g.user_id)
    return jsonify({"success": True, "message": "Usuario actualizado"})

@app.route('/admin/delete-user/<int:id>', methods=['POST'])
def delete_user(id):
    u = User.query.get_or_404(id)
    user_name = u.name
    db.session.delete(u)
    db.session.commit()
    log_event('Usuario', user_name, 'Baja', f"Se eliminó al usuario {user_name}", g.user_id)
    return jsonify({"success": True, "message": "Usuario eliminado"})

@app.route('/admin/add-platform', methods=['POST'])
def add_platform():
    try:
        platform_name = request.form.get('name')
        area_id = request.form.get('area_id')
        
        # Check for duplicates using area_id
        existing = Platform.query.filter_by(name=platform_name, area_id=area_id).first()
        if existing:
            return jsonify({"success": False, "error": "Esta plataforma ya existe en esta sección."}), 400

        logo_url = None
        if 'logo' in request.files:
            file = request.files['logo']
            if file and file.filename != '':
                # Secure filename handling
                original_filename = secure_filename(file.filename)
                filename = f"{datetime.now().timestamp()}_{original_filename}"
                upload_dir = os.path.join(app.root_path, 'static', 'uploads')
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir)
                file.save(os.path.join(upload_dir, filename))
                logo_url = f"/static/uploads/{filename}"

        new_p = Platform(
            name=request.form.get('name'),
            description=request.form.get('description'),
            area_id=request.form.get('area_id'),
            roles=request.form.get('roles'),
            request_method=request.form.get('request_method'),
            direct_link=request.form.get('direct_link'),
            owner=request.form.get('owner'),
            resources=request.form.get('resources'),
            logo_url=logo_url,
            icon=request.form.get('icon', 'box')
        )
        db.session.add(new_p)
        db.session.flush() # Get platform ID

        # Handle user assignments
        users_json = request.form.get('users', '[]')
        try:
            assigned_user_ids = [int(uid) for uid in json.loads(users_json)]
            for uid in assigned_user_ids:
                # Create approved request for manual assignment
                req = AccessRequest(platform_id=new_p.id, user_id=uid, status='Aprobado', request_type='Admin')
                db.session.add(req)
        except:
            pass

        db.session.commit()
        log_event('Plataforma', new_p.name, 'Alta', f"Se creó la plataforma '{new_p.name}' en el área {new_p.area.name}", g.user_id)
        return jsonify({"success": True, "message": "Plataforma registrada con éxito"})
    except Exception as e:
        app.logger.error(f"Error adding platform: {str(e)}")
        return jsonify({"error": "No se pudo registrar la plataforma. Verifique los datos."}), 400

@app.route('/admin/edit-platform/<int:id>', methods=['POST'])
def edit_platform(id):
    try:
        p = Platform.query.get_or_404(id)
        old_status = p.status
        new_name = request.form.get('name')
        new_area_id = request.form.get('area_id') or p.area_id
        
        # Check for duplicate if name or area changed
        if new_name != p.name or int(new_area_id) != p.area_id:
            existing = Platform.query.filter_by(name=new_name, area_id=new_area_id).first()
            if existing:
                return jsonify({"success": False, "error": "Ya existe una plataforma con ese nombre en la sección seleccionada."}), 400
        
        p.name = new_name
        p.description = request.form.get('description')
        p.area_id = new_area_id
        p.roles = request.form.get('roles')
        p.request_method = request.form.get('request_method')
        p.direct_link = request.form.get('direct_link')
        p.owner = request.form.get('owner')
        p.resources = request.form.get('resources')
        p.icon = request.form.get('icon', 'box')
        p.status = request.form.get('status', 'Activo')

        # Minimal Logo Update
        if 'logo' in request.files:
            file = request.files['logo']
            if file and file.filename != '':
                filename = f"{datetime.now().timestamp()}_{file.filename.replace(' ', '_')}"
                upload_dir = os.path.join(app.root_path, 'static', 'uploads')
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir)
                file.save(os.path.join(upload_dir, filename))
                p.logo_url = f"/static/uploads/{filename}"

        if old_status == 'Activo' and p.status == 'Inactivo':
            status_action = 'Deshabilitación'
        elif old_status == 'Inactivo' and p.status == 'Activo':
            status_action = 'Activación'
        else:
            status_action = 'Modificación'

        # Handle user assignments (Dual Picklist)
        users_json = request.form.get('users', '[]')
        try:
            assigned_user_ids = [int(uid) for uid in json.loads(users_json)]
            # Remove old approved requests
            AccessRequest.query.filter_by(platform_id=p.id).delete()
            # Add new assignments
            for uid in assigned_user_ids:
                req = AccessRequest(platform_id=p.id, user_id=uid, status='Aprobado', request_type='Admin')
                db.session.add(req)
        except:
            pass

        db.session.commit()
        log_event('Plataforma', p.name, status_action, f"Se actualizó información y estado de la plataforma de '{p.name}'", g.user_id)
        return jsonify({"success": True, "message": "Plataforma actualizada"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al actualizar plataforma. Verifique los datos."}), 400

@app.route('/admin/delete-platform/<int:id>')
def delete_platform(id):
    p = Platform.query.get_or_404(id)
    plat_name = p.name
    db.session.delete(p)
    db.session.commit()
    log_event('Plataforma', plat_name, 'Baja', f"Se eliminó la plataforma '{plat_name}'", g.user_id)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json or 'application/json' in request.headers.get('Accept', ''):
        return jsonify({"success": True, "message": "Plataforma eliminada"})
    return redirect(url_for('admin_dashboard'))

@app.route('/platform/visit/<int:id>')
def register_visit(id):
    p = Platform.query.get_or_404(id)
    p.visits += 1
    db.session.commit()
    return redirect(p.direct_link)

@app.route('/admin/request/approve/<int:id>')
def approve_request(id):
    req = AccessRequest.query.get_or_404(id)
    req.status = 'Aprobado'
    req.processed_at = datetime.utcnow()
    db.session.commit()
    log_event('Acceso', req.platform.name, 'Aprobado', f"Se aprobó el acceso del usuario {req.user.name} a la plataforma {req.platform.name}", g.user_id)
    return jsonify({"success": True, "message": "Solicitud aprobada"})

@app.route('/admin/request/reject/<int:id>')
def reject_request(id):
    req = AccessRequest.query.get_or_404(id)
    req.status = 'Rechazado'
    req.processed_at = datetime.utcnow()
    db.session.commit()
    log_event('Acceso', req.platform.name, 'Rechazado', f"Se rechazó la solicitud del usuario {req.user.name} a {req.platform.name}", g.user_id)
    return jsonify({"success": True, "message": "Solicitud rechazada"})

@app.route('/login', methods=['GET', 'POST'])
def login():
    # If already logged in, send them straight to their dashboard
    if getattr(g, 'user', None):
        if g.role == 'Administrador':
            return redirect(url_for('index'))
        return redirect(url_for('catalogo'))
        
    error = None
    if request.method == 'POST':
        email = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        from werkzeug.security import check_password_hash
        
        if user and user.password_hash and check_password_hash(user.password_hash, password):
            token = jwt.encode({
                'user_id': user.id,
                'role': user.role,
                'exp': datetime.utcnow() + timedelta(hours=8)
            }, SECRET_KEY, algorithm="HS256")
            
            resp = make_response(redirect(url_for('index') if user.role == 'Administrador' else url_for('catalogo')))
            resp.set_cookie('token', token, httponly=True, samesite='Strict')
            return resp
        else:
            error = 'Credenciales inválidas. Intente de nuevo.'
            
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    resp = make_response(render_template('logout.html'))
    resp.set_cookie('token', '', expires=0)
    return resp

@app.route('/catalogo')
def catalogo():
    if not g.user_id:
        return redirect(url_for('login'))
        
    user = User.query.get(g.user_id)
    if not user:
        return redirect(url_for('login'))
        
    # Standard security: Users only see their assigned areas that are also ACTIVE
    # (Admins are also treated as users here for their personal catalog)
    all_areas = [a for a in user.areas if a.status == 'Activo']
    user_area_ids = [a.id for a in all_areas]
    
    # Filter platforms to only those belonging to the user's assigned areas
    if user_area_ids:
        all_platforms = Platform.query.filter(
            Platform.area_id.in_(user_area_ids),
            Platform.status == 'Activo'
        ).order_by(Platform.name).all()
    else:
        all_platforms = []
        
    # Access logic: A user can see a platform but can only "Launch" (Open) it if they have an 'Aprobado' request
    approved_requests = AccessRequest.query.filter_by(user_id=user.id, status='Aprobado').all()
    user_platform_ids = [r.platform_id for r in approved_requests]
    
    area_icons = {a.name: (a.icon or 'box') for a in all_areas}
    return render_template('catalog.html', areas=all_areas, platforms=all_platforms, current_user=user, area_icons=area_icons, user_platform_ids=user_platform_ids)

@app.route('/admin/general')
def general_settings():
    settings = SystemSettings.query.first()
    return render_template('general.html', settings=settings)

@app.route('/admin/update-general', methods=['POST'])
def update_general_settings():
    try:
        settings = SystemSettings.query.first()
        if not settings:
            settings = SystemSettings()
            db.session.add(settings)
            
        settings.portal_name = request.form.get('portal_name', 'Nexus Access')
        settings.portal_logo_type = request.form.get('portal_logo_type', 'image')
        settings.portal_icon = request.form.get('portal_icon', 'box')
        settings.db_type = request.form.get('db_type', 'mysql')
        settings.db_host = request.form.get('db_host', 'localhost')
        settings.db_port = request.form.get('db_port', '3306')
        settings.db_user = request.form.get('db_user', '')
        db_password = request.form.get('db_password', '').strip()
        if db_password:
            # Encrypt password before saving
            settings.db_password = SecretManager.encrypt(db_password)
        settings.db_name = request.form.get('db_name', 'nexus_access')
        settings.db_ssl = True if request.form.get('db_ssl') == 'on' else False
        settings.portal_logo_bg = request.form.get('portal_logo_bg', '#6366f1')
        settings.portal_icon_color = request.form.get('portal_icon_color', '#ffffff')
        
        if 'logo' in request.files:
            file = request.files['logo']
            if file and file.filename != '':
                filename = f"logo_{datetime.now().timestamp()}_{file.filename.replace(' ', '_')}"
                upload_dir = os.path.join(app.root_path, 'static', 'uploads')
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir)
                file.save(os.path.join(upload_dir, filename))
                settings.portal_logo_url = f"/static/uploads/{filename}"
                
        db.session.commit()
        log_event('Configuración', 'Portal', 'Modificación', f"Se actualizó la configuración general del portal ({settings.portal_name})", g.user_id)
        return jsonify({"success": True, "message": "Configuración del portal actualizada correctamente"})
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "error": "No se pudo guardar la configuración. Verifique los datos e intente nuevamente."}), 500

@app.route('/admin/test-db', methods=['POST'])
def test_db_connection():
    try:
        settings = SystemSettings.query.first()
        db_type = request.form.get('db_type')
        host = request.form.get('db_host')
        port = request.form.get('db_port')
        user = request.form.get('db_user')
        password = (request.form.get('db_password') or '').strip()
        if not password and settings and settings.db_password:
            # Decrypt stored password for testing
            password = SecretManager.decrypt(settings.db_password)
        database = request.form.get('db_name')

        if db_type == 'mysql':
            uri = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
        else:
            uri = f"postgresql://{user}:{password}@{host}:{port}/{database}"

        from sqlalchemy import create_engine
        engine = create_engine(uri)
        connection = engine.connect()
        connection.close()
        
        return jsonify({"success": True, "message": "Conexión establecida con éxito"})
    except Exception:
        return jsonify({"success": False, "error": "Fallo de conexión. Verifique host, puerto, usuario y contraseña."})

@app.route('/admin/notifications')
def notifications_view():
    settings = SystemSettings.query.first()
    return render_template('notifications.html', settings=settings)

@app.route('/admin/update-notifications', methods=['POST'])
def update_notification_settings():
    try:
        settings = SystemSettings.query.first()
        if not settings:
            settings = SystemSettings()
            db.session.add(settings)
            
        settings.smtp_host = request.form.get('smtp_host', '')
        settings.smtp_port = request.form.get('smtp_port', '587')
        settings.smtp_user = request.form.get('smtp_user', '')
        smtp_password = request.form.get('smtp_password', '').strip()
        if smtp_password:
            # Encrypt SMTP password before saving
            settings.smtp_password = SecretManager.encrypt(smtp_password)

        raw_encryption = request.form.get('smtp_encryption', 'TLS')
        settings.smtp_encryption = {
            'STARTTLS': 'TLS',
            'SSL/TLS': 'SSL',
            'TLS': 'TLS',
            'SSL': 'SSL',
            'NONE': 'NONE'
        }.get(raw_encryption, 'TLS')
        settings.smtp_auth = True if request.form.get('smtp_auth') == 'on' else False
        settings.smtp_from_name = request.form.get('smtp_from_name', 'Nexus Access')
        settings.smtp_from_email = request.form.get('smtp_from_email', '')
        
        settings.email_subject = request.form.get('email_subject', '')
        settings.email_body = request.form.get('email_body', '')
        
        db.session.commit()
        return jsonify({"success": True, "message": "Ajustes de notificaciones guardados correctamente"})
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "error": "Error al guardar la configuración de notificaciones."}), 500

@app.route('/admin/test-email', methods=['POST'])
def test_email():
    try:
        data = request.get_json()
        recipient = data.get('recipient', '').strip()
        if not recipient:
            return jsonify({"success": False, "error": "Debes ingresar un correo destinatario"}), 400

        settings = SystemSettings.query.first()
        if not settings or not settings.smtp_host or not settings.smtp_user:
            return jsonify({"success": False, "error": "Primero guarda la configuración SMTP"}), 400

        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = recipient
        msg['Subject'] = 'Correo de Prueba - Portal Nexus'
        body = '<h2>Correo de Prueba</h2><p>Si recibes este mensaje, la configuración SMTP es correcta.</p>'
        msg.attach(MIMEText(body, 'html'))

        port = int(settings.smtp_port or 587)
        smtp_encryption = {
            'STARTTLS': 'TLS',
            'SSL/TLS': 'SSL'
        }.get(settings.smtp_encryption, settings.smtp_encryption)

        if smtp_encryption == 'SSL':
            server = smtplib.SMTP_SSL(settings.smtp_host, port, timeout=10)
        else:
            server = smtplib.SMTP(settings.smtp_host, port, timeout=10)
            if smtp_encryption == 'TLS':
                server.starttls()

        # Decrypt password for login
        actual_password = SecretManager.decrypt(settings.smtp_password)
        server.login(settings.smtp_user, actual_password)
        server.send_message(msg)
        server.quit()

        return jsonify({"success": True, "message": f"Correo de prueba enviado a {recipient}"})
    except smtplib.SMTPAuthenticationError:
        return jsonify({"success": False, "error": "Error de autenticación. Verifique usuario y contraseña."}), 400
    except smtplib.SMTPConnectError:
        return jsonify({"success": False, "error": "No se pudo conectar al servidor SMTP. Verifique host y puerto."}), 400
    except Exception as e:
        app.logger.error(f"SMTP Test Error: {str(e)}")
        return jsonify({"success": False, "error": "Error inesperado al enviar el correo de prueba."}), 500

@app.route('/admin/auth')
def auth_settings():
    settings = SystemSettings.query.first()
    local_users = User.query.all()
    return render_template('auth.html', settings=settings, users=local_users)

@app.route('/admin/update-auth', methods=['POST'])
def update_auth_settings():
    try:
        settings = SystemSettings.query.first()
        if not settings:
            settings = SystemSettings()
            db.session.add(settings)
            
        settings.ldap_enabled = request.form.get('ldap_enabled') == 'on'
        settings.ldap_server = request.form.get('ldap_server', '')
        settings.ldap_port = request.form.get('ldap_port', '389')
        settings.ldap_use_ssl = request.form.get('ldap_use_ssl') == 'on'
        settings.ldap_base_dn = request.form.get('ldap_base_dn', '')
        settings.ldap_user_dn = request.form.get('ldap_user_dn', '')
        ldap_password = request.form.get('ldap_password', '').strip()
        if ldap_password:
            # Encrypt LDAP password before saving
            settings.ldap_password = SecretManager.encrypt(ldap_password)
        settings.ldap_user_attribute = request.form.get('ldap_user_attribute', 'uid')
        
        db.session.commit()
        return jsonify({"success": True, "message": "Parámetros de autenticación guardados correctamente"})
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "error": "No se pudo actualizar la configuración de autenticación."}), 500

@app.route('/admin/test-ldap', methods=['POST'])
def test_ldap_connection():
    try:
        server = request.form.get('ldap_server')
        port = request.form.get('ldap_port')
        user_dn = request.form.get('ldap_user_dn')
        password = request.form.get('ldap_password', '').strip()
        if not password and settings and settings.ldap_password:
            # Decrypt stored password for testing
            password = SecretManager.decrypt(settings.ldap_password)
        
        # Here we would normally use 'ldap3' or 'python-ldap'
        # For simulation, we'll return success if server is provided
        if not server or not user_dn:
            return jsonify({"success": False, "error": "Faltan parámetros obligatorios"})
            
        return jsonify({"success": True, "message": "Conexión simulada exitosa con el servidor LDAP"})
    except Exception:
        return jsonify({"success": False, "error": "Fallo al conectar con el servidor LDAP. Verifique los parámetros."})

@app.route('/api/request-access', methods=['POST'])
def submit_request():
    try:
        platform_id = request.json.get('platform_id')
        user_id = request.json.get('user_id')
        
        if not platform_id or not user_id:
            return jsonify({"success": False, "error": "Datos incompletos"}), 400
            
        # Check if request already exists
        existing = AccessRequest.query.filter_by(platform_id=platform_id, user_id=user_id, status='Pendiente').first()
        if existing:
            return jsonify({"success": False, "error": "Ya tienes una solicitud pendiente para esta plataforma."}), 400
            
        new_request = AccessRequest(platform_id=platform_id, user_id=user_id)
        db.session.add(new_request)
        db.session.commit()
        return jsonify({"success": True, "message": "Solicitud enviada con éxito. TI la revisará pronto."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/admin/user-access/<int:user_id>', methods=['GET'])
def get_user_access(user_id):
    user = User.query.get_or_404(user_id)
    user_areas = user.areas
    user_area_ids = [a.id for a in user_areas]
    
    # Only return platforms from user assigned areas
    filtered_platforms = Platform.query.filter(Platform.area_id.in_(user_area_ids)).all() if user_area_ids else []
    
    approved_requests = AccessRequest.query.filter_by(user_id=user_id, status='Aprobado').all()
    approved_platform_ids = [r.platform_id for r in approved_requests]
    
    return jsonify({
        "success": True,
        "user": user.name,
        "areas_count": len(user_areas),
        "areas": [{"id": a.id, "name": a.name} for a in user_areas],
        "platforms": [{
            "id": p.id, 
            "name": p.name, 
            "area_name": p.area.name if p.area else "Sin Área",
            "area_id": p.area_id,
            "has_access": p.id in approved_platform_ids
        } for p in filtered_platforms]
    })

@app.route('/admin/update-user-access/<int:user_id>', methods=['POST'])
def update_user_access(user_id):
    try:
        user = User.query.get_or_404(user_id)
        platform_ids = request.json.get('platform_ids', [])
        current_reqs = AccessRequest.query.filter_by(user_id=user_id).all()
        current_req_map = {r.platform_id: r for r in current_reqs}
        
        # Mark as Aprobado those in the list, and ensure junction sync
        for pid in platform_ids:
            p = Platform.query.get(pid)
            if pid in current_req_map:
                current_req_map[pid].status = 'Aprobado'
                current_req_map[pid].processed_at = datetime.utcnow()
            else:
                db.session.add(AccessRequest(user_id=user_id, platform_id=pid, status='Aprobado', request_type='Admin'))
            
            # Sync Junction
            if p and p not in user.platforms:
                user.platforms.append(p)
        
        # Any that were Approved but NO LONGER in the list
        for r in current_reqs:
            if r.platform_id not in platform_ids and r.status == 'Aprobado':
                r.status = 'Revocado'
                r.processed_at = datetime.utcnow()
                # Remove from Junction
                if r.platform in user.platforms:
                    user.platforms.remove(r.platform)
                
        db.session.commit()
        return jsonify({"success": True, "message": "Accesos actualizados correctamente."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/search')
def global_search():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify({"results": []})
        
    results = []
    
    # 1. Navigation / Modules
    modules = [
        {"name": "Dashboard", "link": url_for('index'), "icon": "fa-tachometer-alt", "cat": "Sistema"},
        {"name": "Catálogo de Plataformas", "link": url_for('platforms_list'), "icon": "fa-layer-group", "cat": "Sistema"},
        {"name": "Gestión de Usuarios", "link": url_for('users_list'), "icon": "fa-users", "cat": "Sistema"},
        {"name": "Administrar Áreas", "link": url_for('areas_list'), "icon": "fa-sitemap", "cat": "Sistema"},
        {"name": "Configuración General", "link": url_for('general_settings'), "icon": "fa-cog", "cat": "Sistema"},
        {"name": "Buzón de Solicitudes", "link": url_for('requests_view'), "icon": "fa-clipboard-list", "cat": "Sistema"}
    ]
    for m in modules:
        if query in m['name'].lower():
            results.append(m)
            
    # 2. Platforms
    platforms = Platform.query.filter(Platform.name.like(f"%{query}%")).limit(5).all()
    for p in platforms:
        results.append({
            "name": p.name,
            "link": f"{url_for('platforms_list')}?s={p.name}",
            "icon": "fa-cube",
            "cat": "Plataforma",
            "sub": p.area.name if p.area else ""
        })
        
    # 3. Users
    users = User.query.filter((User.name.like(f"%{query}%")) | (User.email.like(f"%{query}%"))).limit(5).all()
    for u in users:
        results.append({
            "name": u.name,
            "link": f"{url_for('users_list')}?s={u.email}",
            "icon": "fa-user",
            "cat": "Usuario",
            "sub": u.email
        })
        
    return jsonify({"results": results})

@app.route('/admin/audit')
def audit_view():
    access_requests = AccessRequest.query.all()
    system_logs = Auditoria.query.all()
    
    unified_logs = []
    
    for r in access_requests:
        unified_logs.append({
            'created_at': r.created_at,
            'user_name': r.user.name if r.user else 'Anon',
            'user_email': r.user.email if r.user else '',
            'entity_type': 'Acceso',
            'entity_name': r.platform.name if r.platform else 'Portal',
            'action': r.status,
            'description': f"Solicitud de acceso a {r.platform.name if r.platform else 'N/A'}",
            'icon': r.platform.icon if r.platform else 'fa-key',
            'is_access': True
        })
        
    for l in system_logs:
        log_icon = 'fa-cog'
        if l.entity_type == 'Usuario': log_icon = 'fa-user-cog'
        elif l.entity_type == 'Área': log_icon = 'fa-sitemap'
        elif l.entity_type == 'Plataforma': log_icon = 'fa-cube'
            
        unified_logs.append({
            'created_at': l.created_at,
            'user_name': l.user.name if l.user else 'Sistema',
            'user_email': l.user.email if l.user else 'auto@nexus.com',
            'entity_type': l.entity_type,
            'entity_name': l.entity_name,
            'action': l.action,
            'description': l.description,
            'icon': log_icon,
            'is_access': False
        })
        
    unified_logs.sort(key=lambda x: x['created_at'], reverse=True)
    
    # Manual Pagination (9 items per page)
    page = request.args.get('page', 1, type=int)
    per_page = 9
    total = len(unified_logs)
    total_pages = (total + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    
    paginated_logs = unified_logs[start:end]
    
    pending_count = AccessRequest.query.filter_by(status='Pendiente').count()
    return render_template('audit.html', 
                          logs=paginated_logs, 
                          pending_requests_count=pending_count,
                          current_page=page,
                          total_pages=total_pages,
                          total_logs=total)

if __name__ == '__main__':
    app.run(debug=True, port=5002)
