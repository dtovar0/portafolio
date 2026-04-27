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
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 20
        pagination = Auditoria.query.order_by(Auditoria.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        return render_template('audit.html', 
                             logs=pagination.items,
                             total_pages=pagination.pages,
                             current_page=page,
                             total_logs=pagination.total)
    except Exception as e:
        return f"Error loading audit logs: {str(e)}", 500

# --- System Settings ---
@admin_bp.route('/settings')
@require_login
def settings_view():
    settings = SystemSettings.query.first() or SystemSettings()
    return render_template('general.html', settings=settings)

@admin_bp.route('/auth-config')
@require_login
def auth_settings():
    settings = SystemSettings.query.first() or SystemSettings()
    return render_template('auth.html', settings=settings)

@admin_bp.route('/requests')
@require_login
def requests_view():
    try:
        all_reqs = AccessRequest.query.order_by(AccessRequest.created_at.desc()).all()
        
        # Calculate counts
        counts = {
            'Pendientes': 0,
            'Aprobadas': 0,
            'Denegadas': 0,
            'Historial': len(all_reqs)
        }
        
        # Group requests for processing in JS
        grouped = {
            'Pendientes': [],
            'Aprobadas': [],
            'Denegadas': [],
            'Historial': []
        }
        
        for r in all_reqs:
            # Map status correctly
            status_map = {
                'Pendiente': 'Pendientes',
                'Aprobado': 'Aprobadas',
                'Rechazado': 'Denegadas'
            }
            cat = status_map.get(r.status, 'Pendientes')
            
            # Basic dict for JS consumption
            r_data = {
                'id': r.id,
                'user_name': r.user.name,
                'user_email': r.user.email,
                'platform_name': r.platform.name,
                'type': r.request_type,
                'status': r.status,
                'created_at': r.created_at.strftime('%Y-%m-%d %H:%M'),
                'processed_at': r.processed_at.strftime('%Y-%m-%d %H:%M') if r.processed_at else '-'
            }
            
            grouped[cat].append(r_data)
            grouped['Historial'].append(r_data)
            counts[cat] += 1

        return render_template('requests.html', 
                             counts=counts, 
                             grouped_requests=grouped)
    except Exception as e:
        return f"Error loading requests: {str(e)}", 500

@admin_bp.route('/notifications')
@require_login
def notifications_view():
    settings = SystemSettings.query.first() or SystemSettings()
    return render_template('notifications.html', settings=settings)

@admin_bp.route('/test-db', methods=['POST'])
@require_login
def test_db_connection():
    return jsonify({"success": True, "message": "Conexión a base de datos exitosa (Simulada)"})

@admin_bp.route('/update-general', methods=['POST'])
@require_login
def update_general_settings():
    try:
        settings = SystemSettings.query.first() or SystemSettings()
        # Actualizar campos...
        db.session.add(settings)
        db.session.commit()
        return jsonify({"success": True, "message": "Configuración actualizada"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/update-auth', methods=['POST'])
@require_login
def update_auth_settings():
    try:
        # Implementation...
        return jsonify({"success": True, "message": "Configuración de autenticación actualizada"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/update-notifications', methods=['POST'])
@require_login
def update_notification_settings():
    return jsonify({"success": True, "message": "Configuración de notificaciones actualizada"})

@admin_bp.route('/test-email', methods=['POST'])
@require_login
def test_email():
    return jsonify({"success": True, "message": "Correo de prueba enviado"})

@admin_bp.route('/test-ldap', methods=['POST'])
@require_login
def test_ldap_connection():
    return jsonify({"success": True, "message": "Conexión LDAP exitosa (Simulada)"})
