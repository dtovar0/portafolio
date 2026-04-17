from flask import Blueprint, render_template, request, jsonify, g, redirect, url_for
from models import db, User, Area, Platform, AccessRequest, Auditoria, SystemSettings, log_event
from utils_nexus import require_login, SecretManager
from werkzeug.security import generate_password_hash

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# --- User Management ---
@admin_bp.route('/users')
@require_login
def users_list():
    users = User.query.all()
    areas = Area.query.all()
    return render_template('users.html', users=users, areas=areas)

@admin_bp.route('/add-user', methods=['POST'])
@require_login
def add_user():
    try:
        data = request.form
        new_user = User(
            name=data.get('name'),
            email=data.get('email'),
            role=data.get('role', 'Usuario'),
            password_hash=generate_password_hash(data.get('password'))
        )
        db.session.add(new_user)
        db.session.commit()
        log_event('Usuario', new_user.name, 'Alta', 'Nuevo usuario creado', user_id=g.user_id)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- Area Management ---
@admin_bp.route('/areas')
@require_login
def areas_list():
    areas = Area.query.all()
    return render_template('areas.html', areas=areas)

@admin_bp.route('/add-area', methods=['POST'])
@require_login
def add_area():
    try:
        name = request.form.get('name')
        new_area = Area(name=name, description=request.form.get('description'))
        db.session.add(new_area)
        db.session.commit()
        log_event('Area', name, 'Alta', f'Nueva área {name} creada', user_id=g.user_id)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- Audit & Logs ---
@admin_bp.route('/audit')
@require_login
def audit_view():
    logs = Auditoria.query.order_by(Auditoria.created_at.desc()).all()
    return render_template('audit.html', logs=logs)

# --- Settings ---
@admin_bp.route('/settings')
@require_login
def settings_view():
    settings = SystemSettings.query.first() or SystemSettings()
    return render_template('settings.html', settings=settings)
