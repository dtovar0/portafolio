from flask import Blueprint, render_template, request, jsonify, g
from models import db, Area, Platform, AccessRequest, User, log_event
from utils_nexus import require_login

catalog_bp = Blueprint('catalog', __name__)

@catalog_bp.route('/')
@require_login
def index():
    try:
        user_id = g.user_id
        user = User.query.get(user_id)
        
        areas = Area.query.filter_by(status='Activo').all()
        platforms = Platform.query.filter_by(status='Activo').all()
        users_count = User.query.count()
        pending_requests = AccessRequest.query.filter_by(status='Pendiente').count()
        
        # Filter platforms to those the user has access to
        user_area_ids = [a.id for a in user.areas]
        approved_reqs = AccessRequest.query.filter_by(user_id=user_id, status='Aprobado').all()
        approved_platform_ids = [r.platform_id for r in approved_reqs]
        
        user_platforms = [p for p in platforms if p.area_id in user_area_ids or p.id in approved_platform_ids]
        
        # Recent activity
        from models import Auditoria
        recent_activity = Auditoria.query.order_by(Auditoria.created_at.desc()).limit(10).all()

        return render_template('index.html', 
                             areas=areas, 
                             platforms=user_platforms,
                             users_count=users_count,
                             pending_requests=pending_requests,
                             recent_activity=recent_activity)
    except Exception as e:
        return f"Error loading dashboard: {str(e)}", 500

@catalog_bp.route('/platforms')
@require_login
def platforms_list():
    try:
        areas = Area.query.order_by(Area.name).all()
        platforms = Platform.query.order_by(Platform.name).all()
        all_users = User.query.filter_by(status='Activo').all()
        
        # Group platforms by area for the frontend
        grouped = {}
        for platform in platforms:
            area_id = platform.area_id
            if area_id not in grouped:
                grouped[area_id] = []
            grouped[area_id].append(platform.to_dict())
            
        area_list = [a.to_dict() for a in areas]
        user_list = [{"id": u.id, "name": u.name} for u in all_users]
        
        return render_template('platforms.html', 
                             grouped_platforms=grouped, 
                             area_list=area_list, 
                             all_users=user_list)
    except Exception as e:
        return f"Error: {str(e)}", 500

@catalog_bp.route('/api/request-access', methods=['POST'])
@require_login
def submit_request():
    try:
        data = request.json
        platform_id = data.get('platform_id')
        user_id = g.user_id
        
        if not platform_id:
            return jsonify({"success": False, "error": "Falta platform_id"}), 400
            
        # Check if already exists
        existing = AccessRequest.query.filter_by(platform_id=platform_id, user_id=user_id, status='Pendiente').first()
        if existing:
            return jsonify({"success": False, "error": "Ya tienes una solicitud pendiente"}), 400
            
        new_req = AccessRequest(platform_id=platform_id, user_id=user_id)
        db.session.add(new_req)
        db.session.commit()
        
        log_event('Solicitud', f'Plataforma ID {platform_id}', 'Alta', f'Usuario {g.user.name} solicitó acceso', user_id=user_id)
        
        return jsonify({"success": True, "message": "Solicitud enviada correctamente"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
