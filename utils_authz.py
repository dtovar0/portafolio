"""
Autorización por alcance de área (scoped authorization) para Nexus Access.

Modelo de roles:
  - Administrador       : superadmin, ve y gestiona todo.
  - AdministradorArea   : alcance limitado a sus áreas (User.areas).
                          Gestiona plataformas y solicitudes de esas áreas.
                          Ve el directorio completo de usuarios, pero solo
                          edita la membresía de sus propias áreas.
  - Usuario             : solo el catálogo y sus propias solicitudes.
"""
from functools import wraps
from flask import g, jsonify

ROLE_SUPERADMIN = 'Administrador'
ROLE_AREA_ADMIN = 'AdministradorArea'
ROLE_USER = 'Usuario'

ADMIN_ROLES = (ROLE_SUPERADMIN, ROLE_AREA_ADMIN)


def is_superadmin(user=None):
    user = user or getattr(g, 'user', None)
    return bool(user) and user.role == ROLE_SUPERADMIN


def is_area_admin(user=None):
    user = user or getattr(g, 'user', None)
    return bool(user) and user.role == ROLE_AREA_ADMIN


def is_any_admin(user=None):
    user = user or getattr(g, 'user', None)
    return bool(user) and user.role in ADMIN_ROLES


def scoped_area_ids(user=None):
    """
    IDs de área que el usuario puede administrar.
    Devuelve None para superadmin (None == sin restricción, ve todo).
    Devuelve [] si no administra ninguna área.
    """
    user = user or getattr(g, 'user', None)
    if not user:
        return []
    if user.role == ROLE_SUPERADMIN:
        return None
    if user.role == ROLE_AREA_ADMIN:
        return [a.id for a in user.areas]
    return []


def can_manage_area(area_id, user=None):
    scope = scoped_area_ids(user)
    if scope is None:
        return True
    return area_id in scope


def can_manage_platform(platform, user=None):
    if platform is None:
        return False
    return can_manage_area(platform.area_id, user)


def filter_by_scope(query, model, user=None):
    """
    Aplica el filtro de alcance a una query sobre un modelo que tenga area_id.
    Superadmin pasa sin filtro; area admin queda limitado a sus áreas.
    """
    scope = scoped_area_ids(user)
    if scope is None:
        return query
    if not scope:
        return query.filter(db_false())
    return query.filter(model.area_id.in_(scope))


def db_false():
    """Predicado siempre falso, para devolver conjuntos vacíos sin romper la query."""
    from sqlalchemy import false
    return false()


def require_role(*roles):
    """Exige uno de los roles indicados. Responde JSON (uso en la API)."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'user', None)
            if not user:
                return jsonify({"success": False, "error": "No autenticado"}), 401
            if user.role not in roles:
                return jsonify({"success": False, "error": "Sin permisos suficientes"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_area_scope(get_area_id):
    """
    Exige que el usuario pueda administrar el área objetivo.
    `get_area_id` recibe los kwargs de la vista y devuelve el area_id a validar.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'user', None)
            if not user:
                return jsonify({"success": False, "error": "No autenticado"}), 401
            if not is_any_admin(user):
                return jsonify({"success": False, "error": "Sin permisos suficientes"}), 403
            area_id = get_area_id(**kwargs)
            if area_id is not None and not can_manage_area(area_id, user):
                return jsonify({"success": False, "error": "El área está fuera de su alcance"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator
