from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Helper Table for Area-User Relationship
user_areas = db.Table('user_areas',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('area_id', db.Integer, db.ForeignKey('area.id'), primary_key=True)
)

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
    roles = db.Column(db.String(200))
    request_method = db.Column(db.Text)
    direct_link = db.Column(db.String(255))
    owner = db.Column(db.String(100))
    resources = db.Column(db.Text)
    logo_url = db.Column(db.String(255))
    icon = db.Column(db.String(50), default='box')
    status = db.Column(db.String(20), default='Activo')
    visits = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    status = db.Column(db.String(20), default='Pendiente') 
    request_type = db.Column(db.String(20), default='Usuario')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)

class Auditoria(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(50))
    entity_name = db.Column(db.String(100))
    action = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    user_name = db.Column(db.String(100))
    user_email = db.Column(db.String(100))
    description = db.Column(db.Text)
    payload = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref=db.backref('auditorias', lazy=True))

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), default='Usuario')
    status = db.Column(db.String(20), default='Activo')
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    areas = db.relationship('Area', secondary=user_areas, backref=db.backref('users', lazy=True))

class SystemSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    portal_name = db.Column(db.String(100), default='Nexus Access')
    portal_logo_url = db.Column(db.String(255))
    portal_logo_type = db.Column(db.String(10), default='image')
    portal_icon = db.Column(db.String(50), default='fa-box')
    db_type = db.Column(db.String(20), default='mysql')
    db_host = db.Column(db.String(100), default='localhost')
    db_port = db.Column(db.String(10), default='3306')
    db_user = db.Column(db.String(100))
    db_password = db.Column(db.String(100))
    db_name = db.Column(db.String(100), default='nexus_access')
    db_ssl = db.Column(db.Boolean, default=False)
    portal_logo_bg = db.Column(db.String(20), default='#6366f1')
    portal_icon_color = db.Column(db.String(20), default='#ffffff')
    smtp_host = db.Column(db.String(100))
    smtp_port = db.Column(db.String(10), default='587')
    smtp_user = db.Column(db.String(100))
    smtp_password = db.Column(db.String(100))
    smtp_encryption = db.Column(db.String(10), default='TLS')
    smtp_auth = db.Column(db.Boolean, default=True)
    smtp_from_name = db.Column(db.String(100), default='Nexus Access')
    smtp_from_email = db.Column(db.String(100))
    email_subject = db.Column(db.String(200), default='Nueva Solicitud de Acceso - Portal Nexus')
    email_body = db.Column(db.Text)
    ldap_enabled = db.Column(db.Boolean, default=False)
    ldap_server = db.Column(db.String(100))
    ldap_port = db.Column(db.String(10), default='389')
    ldap_base_dn = db.Column(db.String(200))
    ldap_user_dn = db.Column(db.String(200))
    ldap_password = db.Column(db.String(100))
    ldap_use_ssl = db.Column(db.Boolean, default=False)
    ldap_user_attribute = db.Column(db.String(50), default='uid')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'portal_name': self.portal_name,
            'portal_logo_url': self.portal_logo_url,
            'portal_logo_type': self.portal_logo_type,
            'portal_icon': self.portal_icon,
            'ldap_enabled': self.ldap_enabled,
            'ldap_server': self.ldap_server
        }

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
