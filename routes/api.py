"""
API JSON para el frontend Next.js.

Todos los endpoints devuelven JSON y aplican alcance por área:
un AdministradorArea solo ve y modifica lo de sus áreas.
"""
from datetime import datetime
from flask import Blueprint, jsonify, request, g
from sqlalchemy import func
from models import db, User, Area, Platform, AccessRequest, Auditoria, SystemSettings, log_event
from utils_authz import (
    ROLE_SUPERADMIN, ROLE_AREA_ADMIN, ROLE_USER, ADMIN_ROLES,
    is_superadmin, is_area_admin, is_any_admin,
    scoped_area_ids, can_manage_area, can_manage_platform,
    require_role,
)

api_bp = Blueprint('api', __name__, url_prefix='/api')


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def auth_required(f):
    from functools import wraps

    @wraps(f)
    def wrapper(*args, **kwargs):
        if not g.user:
            return jsonify({"success": False, "error": "No autenticado"}), 401
        if g.user.status != 'Activo':
            return jsonify({"success": False, "error": "Usuario inactivo"}), 403
        return f(*args, **kwargs)
    return wrapper


def scoped_areas_query():
    """Query de áreas limitada al alcance del usuario."""
    scope = scoped_area_ids()
    q = Area.query
    if scope is None:
        return q
    if not scope:
        return q.filter(Area.id.in_([-1]))
    return q.filter(Area.id.in_(scope))


def scoped_platforms_query():
    """Query de plataformas limitada al alcance del usuario."""
    scope = scoped_area_ids()
    q = Platform.query
    if scope is None:
        return q
    if not scope:
        return q.filter(Platform.id.in_([-1]))
    return q.filter(Platform.area_id.in_(scope))


def area_payload(a):
    return {
        'id': a.id, 'name': a.name, 'description': a.description,
        'status': a.status, 'icon': a.icon, 'color': a.color,
        'platforms_count': len(a.platforms),
    }


def platform_payload(p):
    return {
        'id': p.id, 'name': p.name, 'description': p.description,
        'area_id': p.area_id, 'area_name': p.area.name if p.area else None,
        'roles': p.roles, 'request_method': p.request_method,
        'direct_link': p.direct_link, 'owner': p.owner, 'resources': p.resources,
        'logo_url': p.logo_url, 'icon': p.icon, 'status': p.status,
        'visits': p.visits,
        'created_at': p.created_at.isoformat() if p.created_at else None,
    }


def user_payload(u, editable=None):
    return {
        'id': u.id, 'name': u.name, 'email': u.email, 'role': u.role,
        'status': u.status,
        'areas': [{'id': a.id, 'name': a.name} for a in u.areas],
        'created_at': u.created_at.isoformat() if u.created_at else None,
        # editable indica si el solicitante puede modificar a este usuario
        'editable': editable,
    }


def request_payload(r):
    return {
        'id': r.id,
        'platform_id': r.platform_id,
        'platform_name': r.platform.name if r.platform else None,
        'area_id': r.platform.area_id if r.platform else None,
        'user_id': r.user_id,
        'user_name': r.user.name if r.user else None,
        'user_email': r.user.email if r.user else None,
        'status': r.status, 'request_type': r.request_type,
        'created_at': r.created_at.isoformat() if r.created_at else None,
        'processed_at': r.processed_at.isoformat() if r.processed_at else None,
    }


# --------------------------------------------------------------------------
# Sesión
# --------------------------------------------------------------------------
@api_bp.route('/me')
def me():
    """Identidad y permisos del solicitante. El frontend arranca por aquí."""
    if not g.user:
        return jsonify({"authenticated": False}), 401

    scope = scoped_area_ids()
    return jsonify({
        "authenticated": True,
        "auth_source": getattr(g, 'auth_source', None),
        "user": {
            'id': g.user.id, 'name': g.user.name, 'email': g.user.email,
            'role': g.user.role, 'status': g.user.status,
        },
        "permissions": {
            "is_superadmin": is_superadmin(),
            "is_area_admin": is_area_admin(),
            "is_admin": is_any_admin(),
            # null = sin restricción (superadmin)
            "scoped_area_ids": scope,
            "areas": [{'id': a.id, 'name': a.name} for a in g.user.areas],
        },
    })


# --------------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------------
@api_bp.route('/dashboard')
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def dashboard():
    areas = scoped_areas_query().filter_by(status='Activo').all()
    platforms = scoped_platforms_query().filter_by(status='Activo').all()
    area_ids = [a.id for a in areas]
    platform_ids = [p.id for p in platforms]

    reqs_q = AccessRequest.query
    if not is_superadmin():
        reqs_q = reqs_q.filter(AccessRequest.platform_id.in_(platform_ids or [-1]))

    if is_superadmin():
        users_count = User.query.count()
    else:
        users_count = (User.query.join(User.areas)
                       .filter(Area.id.in_(area_ids or [-1]))
                       .distinct().count())

    top = sorted(platforms, key=lambda p: p.visits or 0, reverse=True)[:6]

    return jsonify({
        "kpis": {
            "areas": len(areas),
            "platforms": len(platforms),
            "users": users_count,
            "pending_requests": reqs_q.filter_by(status='Pendiente').count(),
            "approved_requests": reqs_q.filter_by(status='Aprobado').count(),
        },
        "platforms_by_area": [
            {"area": a.name, "count": len([p for p in platforms if p.area_id == a.id])}
            for a in areas
        ],
        "top_platforms": [{"name": p.name, "visits": p.visits or 0} for p in top],
        "recent_requests": [request_payload(r) for r in
                            reqs_q.order_by(AccessRequest.created_at.desc()).limit(5).all()],
    })


# --------------------------------------------------------------------------
# Catálogo (vista de usuario final — sin alcance de admin)
# --------------------------------------------------------------------------
@api_bp.route('/catalog')
@auth_required
def catalog():
    areas = Area.query.filter_by(status='Activo').order_by(Area.name).all()
    platforms = Platform.query.filter_by(status='Activo').order_by(Platform.name).all()

    approved = {r.platform_id for r in AccessRequest.query.filter_by(
        user_id=g.user.id, status='Aprobado').all()}
    pending = {r.platform_id for r in AccessRequest.query.filter_by(
        user_id=g.user.id, status='Pendiente').all()}
    my_area_ids = {a.id for a in g.user.areas}

    items = []
    for p in platforms:
        has_access = p.id in approved or p.area_id in my_area_ids
        payload = platform_payload(p)
        payload['has_access'] = has_access
        payload['request_pending'] = p.id in pending
        items.append(payload)

    return jsonify({
        "areas": [area_payload(a) for a in areas],
        "platforms": items,
    })


@api_bp.route('/platforms/<int:pid>/visit', methods=['POST'])
@auth_required
def register_visit(pid):
    p = Platform.query.get(pid)
    if not p:
        return jsonify({"success": False, "error": "Plataforma no encontrada"}), 404
    p.visits = (p.visits or 0) + 1
    db.session.commit()
    return jsonify({"success": True, "url": p.direct_link, "visits": p.visits})


# --------------------------------------------------------------------------
# Áreas
# --------------------------------------------------------------------------
@api_bp.route('/areas', methods=['GET'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def areas_list():
    areas = scoped_areas_query().order_by(Area.name).all()
    return jsonify({"areas": [area_payload(a) for a in areas]})


@api_bp.route('/areas', methods=['POST'])
@auth_required
@require_role(ROLE_SUPERADMIN)  # crear áreas es exclusivo del superadmin
def area_create():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({"success": False, "error": "El nombre es obligatorio"}), 400
    if Area.query.filter(func.lower(Area.name) == name.lower()).first():
        return jsonify({"success": False, "error": "Ya existe un área con ese nombre"}), 409

    a = Area(name=name, description=data.get('description'),
             status=data.get('status', 'Activo'), icon=data.get('icon', 'box'),
             color=data.get('color'))
    db.session.add(a)
    db.session.commit()
    log_event('Area', a.name, 'Alta', f'Área {a.name} creada', user_id=g.user.id)
    return jsonify({"success": True, "area": area_payload(a)}), 201


@api_bp.route('/areas/<int:aid>', methods=['PUT'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def area_update(aid):
    a = Area.query.get(aid)
    if not a:
        return jsonify({"success": False, "error": "Área no encontrada"}), 404
    if not can_manage_area(a.id):
        return jsonify({"success": False, "error": "El área está fuera de su alcance"}), 403

    data = request.get_json(silent=True) or {}
    if 'name' in data:
        new_name = (data['name'] or '').strip()
        if not new_name:
            return jsonify({"success": False, "error": "El nombre no puede estar vacío"}), 400
        dup = Area.query.filter(func.lower(Area.name) == new_name.lower(), Area.id != a.id).first()
        if dup:
            return jsonify({"success": False, "error": "Ya existe un área con ese nombre"}), 409
        a.name = new_name
    for field in ('description', 'status', 'icon', 'color'):
        if field in data:
            setattr(a, field, data[field])

    db.session.commit()
    log_event('Area', a.name, 'Edición', f'Área {a.name} actualizada', user_id=g.user.id)
    return jsonify({"success": True, "area": area_payload(a)})


@api_bp.route('/areas/<int:aid>', methods=['DELETE'])
@auth_required
@require_role(ROLE_SUPERADMIN)
def area_delete(aid):
    a = Area.query.get(aid)
    if not a:
        return jsonify({"success": False, "error": "Área no encontrada"}), 404
    if a.platforms:
        return jsonify({"success": False,
                        "error": f"El área tiene {len(a.platforms)} plataforma(s). Reasígnelas antes de eliminar."}), 409
    name = a.name
    db.session.delete(a)
    db.session.commit()
    log_event('Area', name, 'Baja', f'Área {name} eliminada', user_id=g.user.id)
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Plataformas
# --------------------------------------------------------------------------
@api_bp.route('/platforms', methods=['GET'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def platforms_list():
    q = scoped_platforms_query()
    if request.args.get('area_id'):
        try:
            q = q.filter(Platform.area_id == int(request.args['area_id']))
        except ValueError:
            return jsonify({"success": False, "error": "area_id inválido"}), 400
    platforms = q.order_by(Platform.name).all()
    return jsonify({"platforms": [platform_payload(p) for p in platforms]})


@api_bp.route('/platforms', methods=['POST'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def platform_create():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    area_id = data.get('area_id')

    if not name or not description or not area_id:
        return jsonify({"success": False,
                        "error": "name, description y area_id son obligatorios"}), 400
    try:
        area_id = int(area_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "area_id inválido"}), 400
    if not Area.query.get(area_id):
        return jsonify({"success": False, "error": "El área no existe"}), 404
    # Un admin de área solo puede crear dentro de sus áreas.
    if not can_manage_area(area_id):
        return jsonify({"success": False, "error": "El área está fuera de su alcance"}), 403

    p = Platform(name=name, description=description, area_id=area_id)
    for field in ('roles', 'request_method', 'direct_link', 'owner',
                  'resources', 'logo_url', 'icon', 'status'):
        if data.get(field) is not None:
            setattr(p, field, data[field])
    db.session.add(p)
    db.session.commit()
    log_event('Plataforma', p.name, 'Alta', f'Plataforma {p.name} creada', user_id=g.user.id)
    return jsonify({"success": True, "platform": platform_payload(p)}), 201


@api_bp.route('/platforms/<int:pid>', methods=['PUT'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def platform_update(pid):
    p = Platform.query.get(pid)
    if not p:
        return jsonify({"success": False, "error": "Plataforma no encontrada"}), 404
    if not can_manage_platform(p):
        return jsonify({"success": False, "error": "La plataforma está fuera de su alcance"}), 403

    data = request.get_json(silent=True) or {}
    # Mover de área exige permiso sobre el área destino además de la origen.
    if 'area_id' in data and data['area_id'] is not None:
        try:
            new_area = int(data['area_id'])
        except (TypeError, ValueError):
            return jsonify({"success": False, "error": "area_id inválido"}), 400
        if not Area.query.get(new_area):
            return jsonify({"success": False, "error": "El área destino no existe"}), 404
        if not can_manage_area(new_area):
            return jsonify({"success": False, "error": "El área destino está fuera de su alcance"}), 403
        p.area_id = new_area

    if 'name' in data:
        if not (data['name'] or '').strip():
            return jsonify({"success": False, "error": "El nombre no puede estar vacío"}), 400
        p.name = data['name'].strip()
    for field in ('description', 'roles', 'request_method', 'direct_link',
                  'owner', 'resources', 'logo_url', 'icon', 'status'):
        if field in data:
            setattr(p, field, data[field])

    db.session.commit()
    log_event('Plataforma', p.name, 'Edición', f'Plataforma {p.name} actualizada', user_id=g.user.id)
    return jsonify({"success": True, "platform": platform_payload(p)})


@api_bp.route('/platforms/<int:pid>', methods=['DELETE'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def platform_delete(pid):
    p = Platform.query.get(pid)
    if not p:
        return jsonify({"success": False, "error": "Plataforma no encontrada"}), 404
    if not can_manage_platform(p):
        return jsonify({"success": False, "error": "La plataforma está fuera de su alcance"}), 403
    name = p.name
    db.session.delete(p)  # las solicitudes caen por cascade
    db.session.commit()
    log_event('Plataforma', name, 'Baja', f'Plataforma {name} eliminada', user_id=g.user.id)
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Usuarios
#
# Regla de alcance (decisión de diseño): un AdministradorArea VE el directorio
# completo — lo necesita para poder incorporar gente nueva a su área — pero
# solo puede MODIFICAR usuarios que ya pertenecen a alguna de sus áreas, y sus
# ediciones nunca alteran la membresía de áreas ajenas.
# --------------------------------------------------------------------------
def _user_is_editable_by_me(u):
    if is_superadmin():
        return True
    scope = set(scoped_area_ids() or [])
    if not scope:
        return False
    # Editable si comparte al menos un área con el alcance del admin.
    return bool(scope & {a.id for a in u.areas})


@api_bp.route('/users', methods=['GET'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def users_list():
    users = User.query.order_by(User.name).all()
    return jsonify({
        "users": [user_payload(u, editable=_user_is_editable_by_me(u)) for u in users],
        # El frontend usa esto para saber qué áreas puede asignar.
        "assignable_area_ids": scoped_area_ids(),
    })


@api_bp.route('/users', methods=['POST'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def user_create():
    from werkzeug.security import generate_password_hash

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    if not name or not email:
        return jsonify({"success": False, "error": "name y email son obligatorios"}), 400
    if User.query.filter(func.lower(User.email) == email).first():
        return jsonify({"success": False, "error": "Ya existe un usuario con ese correo"}), 409

    role = data.get('role', ROLE_USER)
    # Solo el superadmin reparte roles administrativos.
    if role in ADMIN_ROLES and not is_superadmin():
        return jsonify({"success": False,
                        "error": "Solo un Administrador puede asignar roles administrativos"}), 403

    area_ids = data.get('area_ids') or []
    scope = scoped_area_ids()
    if scope is not None:
        invalid = set(area_ids) - set(scope)
        if invalid:
            return jsonify({"success": False,
                            "error": "Solo puede asignar áreas de su alcance"}), 403

    u = User(name=name, email=email, role=role, status=data.get('status', 'Activo'))
    password = data.get('password')
    if password:
        u.password_hash = generate_password_hash(password)
    if area_ids:
        u.areas = Area.query.filter(Area.id.in_(area_ids)).all()

    db.session.add(u)
    db.session.commit()
    log_event('Usuario', u.name, 'Alta', f'Usuario {u.email} creado', user_id=g.user.id)
    return jsonify({"success": True, "user": user_payload(u, editable=True)}), 201


@api_bp.route('/users/<int:uid>', methods=['PUT'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def user_update(uid):
    from werkzeug.security import generate_password_hash

    u = User.query.get(uid)
    if not u:
        return jsonify({"success": False, "error": "Usuario no encontrado"}), 404
    if not _user_is_editable_by_me(u):
        return jsonify({"success": False, "error": "El usuario está fuera de su alcance"}), 403

    data = request.get_json(silent=True) or {}

    if 'role' in data and data['role'] != u.role:
        if not is_superadmin():
            return jsonify({"success": False,
                            "error": "Solo un Administrador puede cambiar roles"}), 403
        # No permitir que el último superadmin se degrade a sí mismo.
        if u.role == ROLE_SUPERADMIN and data['role'] != ROLE_SUPERADMIN:
            remaining = User.query.filter(User.role == ROLE_SUPERADMIN,
                                          User.id != u.id,
                                          User.status == 'Activo').count()
            if remaining == 0:
                return jsonify({"success": False,
                                "error": "No puede degradar al único Administrador activo"}), 409
        u.role = data['role']

    if 'name' in data and (data['name'] or '').strip():
        u.name = data['name'].strip()
    if 'email' in data:
        new_email = (data['email'] or '').strip().lower()
        if not new_email:
            return jsonify({"success": False, "error": "El correo no puede estar vacío"}), 400
        dup = User.query.filter(func.lower(User.email) == new_email, User.id != u.id).first()
        if dup:
            return jsonify({"success": False, "error": "Ya existe un usuario con ese correo"}), 409
        u.email = new_email
    if 'status' in data:
        u.status = data['status']
    if data.get('password'):
        u.password_hash = generate_password_hash(data['password'])

    # Membresía de áreas: un admin de área solo altera SUS áreas; las ajenas
    # se preservan intactas.
    if 'area_ids' in data:
        requested = set(data['area_ids'] or [])
        scope = scoped_area_ids()
        if scope is None:
            u.areas = Area.query.filter(Area.id.in_(requested)).all() if requested else []
        else:
            scope = set(scope)
            invalid = requested - scope
            if invalid:
                return jsonify({"success": False,
                                "error": "Solo puede asignar áreas de su alcance"}), 403
            preserved = [a for a in u.areas if a.id not in scope]
            newly = Area.query.filter(Area.id.in_(requested)).all() if requested else []
            u.areas = preserved + newly

    db.session.commit()
    log_event('Usuario', u.name, 'Edición', f'Usuario {u.email} actualizado', user_id=g.user.id)
    return jsonify({"success": True, "user": user_payload(u, editable=True)})


@api_bp.route('/users/<int:uid>', methods=['DELETE'])
@auth_required
@require_role(ROLE_SUPERADMIN)  # borrar usuarios es exclusivo del superadmin
def user_delete(uid):
    u = User.query.get(uid)
    if not u:
        return jsonify({"success": False, "error": "Usuario no encontrado"}), 404
    if u.id == g.user.id:
        return jsonify({"success": False, "error": "No puede eliminarse a sí mismo"}), 409
    if u.role == ROLE_SUPERADMIN:
        remaining = User.query.filter(User.role == ROLE_SUPERADMIN, User.id != u.id,
                                      User.status == 'Activo').count()
        if remaining == 0:
            return jsonify({"success": False,
                            "error": "No puede eliminar al único Administrador activo"}), 409
    email = u.email
    name = u.name
    db.session.delete(u)
    db.session.commit()
    log_event('Usuario', name, 'Baja', f'Usuario {email} eliminado', user_id=g.user.id)
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Solicitudes de acceso
# --------------------------------------------------------------------------
def scoped_requests_query():
    """Solicitudes cuyas plataformas caen dentro del alcance del admin."""
    q = AccessRequest.query.join(Platform, AccessRequest.platform_id == Platform.id)
    scope = scoped_area_ids()
    if scope is None:
        return q
    if not scope:
        return q.filter(Platform.id.in_([-1]))
    return q.filter(Platform.area_id.in_(scope))


@api_bp.route('/requests', methods=['GET'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def requests_list():
    q = scoped_requests_query()
    status = request.args.get('status')
    if status:
        q = q.filter(AccessRequest.status == status)
    items = q.order_by(AccessRequest.created_at.desc()).all()

    counts_q = scoped_requests_query()
    return jsonify({
        "requests": [request_payload(r) for r in items],
        "counts": {
            "pending": counts_q.filter(AccessRequest.status == 'Pendiente').count(),
            "approved": counts_q.filter(AccessRequest.status == 'Aprobado').count(),
            "rejected": counts_q.filter(AccessRequest.status == 'Rechazado').count(),
        },
    })


@api_bp.route('/requests/mine', methods=['GET'])
@auth_required
def my_requests():
    items = AccessRequest.query.filter_by(user_id=g.user.id) \
        .order_by(AccessRequest.created_at.desc()).all()
    return jsonify({"requests": [request_payload(r) for r in items]})


@api_bp.route('/requests', methods=['POST'])
@auth_required
def request_create():
    data = request.get_json(silent=True) or {}
    platform_id = data.get('platform_id')
    if not platform_id:
        return jsonify({"success": False, "error": "platform_id es obligatorio"}), 400

    p = Platform.query.get(platform_id)
    if not p:
        return jsonify({"success": False, "error": "Plataforma no encontrada"}), 404
    if p.status != 'Activo':
        return jsonify({"success": False, "error": "La plataforma no está activa"}), 409

    existing = AccessRequest.query.filter_by(
        platform_id=platform_id, user_id=g.user.id, status='Pendiente').first()
    if existing:
        return jsonify({"success": False, "error": "Ya tiene una solicitud pendiente"}), 409
    already = AccessRequest.query.filter_by(
        platform_id=platform_id, user_id=g.user.id, status='Aprobado').first()
    if already:
        return jsonify({"success": False, "error": "Ya tiene acceso aprobado"}), 409

    r = AccessRequest(platform_id=platform_id, user_id=g.user.id,
                      request_type=data.get('request_type', 'Usuario'))
    db.session.add(r)
    db.session.commit()
    log_event('Solicitud', p.name, 'Alta',
              f'{g.user.name} solicitó acceso a {p.name}', user_id=g.user.id)
    return jsonify({"success": True, "request": request_payload(r)}), 201


def _resolve_request(rid, new_status, action_label):
    r = AccessRequest.query.get(rid)
    if not r:
        return jsonify({"success": False, "error": "Solicitud no encontrada"}), 404
    if not can_manage_platform(r.platform):
        return jsonify({"success": False, "error": "La solicitud está fuera de su alcance"}), 403
    if r.status != 'Pendiente':
        return jsonify({"success": False,
                        "error": f"La solicitud ya fue procesada ({r.status})"}), 409

    r.status = new_status
    r.processed_at = datetime.utcnow()
    db.session.commit()
    log_event('Solicitud', r.platform.name if r.platform else str(rid), action_label,
              f'Solicitud de {r.user.email if r.user else "?"} {action_label.lower()}',
              user_id=g.user.id)
    return jsonify({"success": True, "request": request_payload(r)})


@api_bp.route('/requests/<int:rid>/approve', methods=['POST'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def request_approve(rid):
    return _resolve_request(rid, 'Aprobado', 'Aprobación')


@api_bp.route('/requests/<int:rid>/reject', methods=['POST'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def request_reject(rid):
    return _resolve_request(rid, 'Rechazado', 'Rechazo')


# --------------------------------------------------------------------------
# Auditoría
# --------------------------------------------------------------------------
@api_bp.route('/audit', methods=['GET'])
@auth_required
@require_role(ROLE_SUPERADMIN, ROLE_AREA_ADMIN)
def audit_list():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    q = Auditoria.query
    # Un admin de área ve la auditoría de sus áreas y plataformas, más la
    # que él mismo generó. Los registros sin entidad asociable no se filtran
    # por área porque el modelo Auditoria no guarda area_id.
    if not is_superadmin():
        scope = set(scoped_area_ids() or [])
        area_names = {a.name for a in Area.query.filter(Area.id.in_(scope or [-1])).all()}
        platform_names = {p.name for p in Platform.query.filter(
            Platform.area_id.in_(scope or [-1])).all()}
        visible = area_names | platform_names
        q = q.filter(db.or_(
            Auditoria.user_id == g.user.id,
            db.and_(Auditoria.entity_type.in_(['Area', 'Plataforma', 'Solicitud']),
                    Auditoria.entity_name.in_(visible or ['__none__'])),
        ))

    pagination = q.order_by(Auditoria.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)

    return jsonify({
        "logs": [{
            'id': l.id, 'entity_type': l.entity_type, 'entity_name': l.entity_name,
            'action': l.action, 'user_name': l.user_name, 'user_email': l.user_email,
            'description': l.description,
            'created_at': l.created_at.isoformat() if l.created_at else None,
        } for l in pagination.items],
        "pagination": {
            "page": page, "per_page": per_page,
            "total": pagination.total, "total_pages": pagination.pages,
        },
    })


# --------------------------------------------------------------------------
# Ajustes del sistema (solo superadmin)
# --------------------------------------------------------------------------
SAFE_SETTINGS_FIELDS = (
    'portal_name', 'portal_logo_url', 'portal_logo_type', 'portal_icon',
    'portal_logo_bg', 'portal_icon_color',
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_encryption', 'smtp_auth',
    'smtp_from_name', 'smtp_from_email', 'email_subject', 'email_body',
)


@api_bp.route('/settings', methods=['GET'])
@auth_required
@require_role(ROLE_SUPERADMIN)
def settings_get():
    s = SystemSettings.query.first()
    if not s:
        s = SystemSettings()
        db.session.add(s)
        db.session.commit()
    payload = {f: getattr(s, f) for f in SAFE_SETTINGS_FIELDS}
    # Nunca se devuelven credenciales; solo si están configuradas.
    payload['smtp_password_set'] = bool(s.smtp_password)
    return jsonify({"settings": payload})


@api_bp.route('/settings', methods=['PUT'])
@auth_required
@require_role(ROLE_SUPERADMIN)
def settings_update():
    s = SystemSettings.query.first()
    if not s:
        s = SystemSettings()
        db.session.add(s)

    data = request.get_json(silent=True) or {}
    for f in SAFE_SETTINGS_FIELDS:
        if f in data:
            setattr(s, f, data[f])
    if data.get('smtp_password'):
        s.smtp_password = data['smtp_password']

    db.session.commit()
    log_event('Configuración', 'Sistema', 'Edición',
              'Ajustes del portal actualizados', user_id=g.user.id)
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Búsqueda global
# --------------------------------------------------------------------------
@api_bp.route('/search', methods=['GET'])
@auth_required
def search():
    term = (request.args.get('q') or '').strip()
    if len(term) < 2:
        return jsonify({"platforms": [], "areas": []})
    like = f'%{term}%'

    # El usuario final busca en el catálogo activo; el admin, en su alcance.
    if is_any_admin():
        p_q = scoped_platforms_query()
        a_q = scoped_areas_query()
    else:
        p_q = Platform.query.filter_by(status='Activo')
        a_q = Area.query.filter_by(status='Activo')

    platforms = p_q.filter(db.or_(Platform.name.ilike(like),
                                  Platform.description.ilike(like))).limit(10).all()
    areas = a_q.filter(Area.name.ilike(like)).limit(10).all()
    return jsonify({
        "platforms": [platform_payload(p) for p in platforms],
        "areas": [area_payload(a) for a in areas],
    })
