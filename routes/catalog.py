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
        
        # 1. KPI Statistics
        areas = Area.query.filter_by(status='Activo').all()
        platforms = Platform.query.filter_by(status='Activo').all()
        users_count = User.query.count()
        pending_requests = AccessRequest.query.filter_by(status='Pendiente').all()
        visits_total = db.session.query(db.func.sum(Platform.visits)).scalar() or 0
        
        # 2. Activity Log
        from models import Auditoria
        recent_activity = Auditoria.query.order_by(Auditoria.created_at.desc()).limit(15).all()

        # 3. Chart Data: Users per Platform
        users_platform_labels = []
        users_platform_values = []
        for p in platforms[:6]:
            users_platform_labels.append(p.name)
            # Count users with approved access + users in the area
            count = AccessRequest.query.filter_by(platform_id=p.id, status='Aprobado').count()
            users_platform_values.append(count)

        # 4. Chart Data: Users per Area
        users_area_labels = []
        users_area_values = []
        users_area_colors = []
        for a in areas[:6]:
            users_area_labels.append(a.name)
            users_area_values.append(len(a.users))
            users_area_colors.append(a.color)

        # 5. Chart Data: Pending Requests per Platform
        pending_map = {}
        for pr in pending_requests:
            p_name = pr.platform.name
            pending_map[p_name] = pending_map.get(p_name, 0) + 1
        
        pending_platform_labels = list(pending_map.keys())
        pending_platform_values = list(pending_map.values())

        # 6. Chart Data: Most Visited
        most_visited = Platform.query.order_by(Platform.visits.desc()).limit(5).all()

        return render_template('index.html', 
                             areas_count_num=len(areas),
                             total=len(platforms),
                             total_users=users_count,
                             pending=len(pending_requests),
                             visits_total=visits_total,
                             log_list=recent_activity,
                             users_platform_labels=users_platform_labels,
                             users_platform_values=users_platform_values,
                             users_area_labels=users_area_labels,
                             users_area_values=users_area_values,
                             users_area_colors=users_area_colors,
                             pending_platform_labels=pending_platform_labels,
                             pending_platform_values=pending_platform_values,
                             most_visited=most_visited)
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
