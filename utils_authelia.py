"""
Integración con Authelia (forward-auth).

Authelia se sitúa delante de la app (nginx/Traefik) e inyecta la identidad
en headers tras autenticar:

    Remote-User    -> username
    Remote-Email   -> email (identificador canónico en Nexus)
    Remote-Name    -> nombre para mostrar
    Remote-Groups  -> lista separada por comas

SEGURIDAD — LEER ANTES DE DESPLEGAR
-----------------------------------
Confiar en headers es seguro SOLO si la app es inalcanzable directamente.
Cualquiera que llegue al puerto de Flask sin pasar por el proxy podría
enviar `Remote-Email: admin@empresa.com` y suplantar a un administrador.

Dos defensas, ambas obligatorias:
  1. Red: el puerto de Flask/Next escucha en loopback o red interna. Nunca
     expuesto. El único camino público es el proxy.
  2. App: AUTHELIA_TRUSTED_IPS restringe qué IP de origen puede inyectar
     estos headers. Si la petición no viene de ahí, los headers se ignoran.

El mapeo de grupos a roles se define en AUTHELIA_GROUP_MAP / prefijo de área.
Authelia es la fuente de verdad del rol y de las áreas (decisión de diseño).
"""
import os
from flask import request, current_app
from models import db, User, Area
from utils_authz import ROLE_SUPERADMIN, ROLE_AREA_ADMIN, ROLE_USER

HDR_USER = 'Remote-User'
HDR_EMAIL = 'Remote-Email'
HDR_NAME = 'Remote-Name'
HDR_GROUPS = 'Remote-Groups'

# Grupo que otorga superadmin
GROUP_SUPERADMIN = 'nexus-admin'
# Prefijo de grupo que otorga admin de área: nexus-area-<slug-del-area>
GROUP_AREA_PREFIX = 'nexus-area-'


def _trusted_ips():
    raw = current_app.config.get('AUTHELIA_TRUSTED_IPS') or ''
    return [ip.strip() for ip in raw.split(',') if ip.strip()]


def request_is_trusted():
    """True si la petición viene de un proxy autorizado a inyectar headers."""
    trusted = _trusted_ips()
    if not trusted:
        # Sin lista configurada no se confía en nadie: fail closed.
        return False
    return request.remote_addr in trusted


def authelia_enabled():
    return bool(current_app.config.get('AUTHELIA_ENABLED'))


def read_identity():
    """
    Lee la identidad de los headers, o None si no aplica.
    Devuelve None si Authelia está desactivado, si el origen no es de
    confianza, o si no hay email en los headers.
    """
    if not authelia_enabled():
        return None
    if not request_is_trusted():
        return None

    email = (request.headers.get(HDR_EMAIL) or '').strip().lower()
    if not email:
        return None

    groups_raw = request.headers.get(HDR_GROUPS) or ''
    groups = [g.strip() for g in groups_raw.split(',') if g.strip()]

    return {
        'username': (request.headers.get(HDR_USER) or '').strip(),
        'email': email,
        'name': (request.headers.get(HDR_NAME) or '').strip() or email,
        'groups': groups,
    }


def _slugify(value):
    return (value or '').strip().lower().replace(' ', '-')


def resolve_role_and_areas(groups):
    """
    Traduce los grupos de Authelia a (rol, [Area]).
    - GROUP_SUPERADMIN            -> Administrador, sin restricción de área
    - GROUP_AREA_PREFIX + <slug>  -> AdministradorArea de esas áreas
    - sin coincidencias           -> Usuario
    """
    if GROUP_SUPERADMIN in groups:
        return ROLE_SUPERADMIN, []

    slugs = [g[len(GROUP_AREA_PREFIX):] for g in groups if g.startswith(GROUP_AREA_PREFIX)]
    if not slugs:
        return ROLE_USER, []

    matched = [a for a in Area.query.all() if _slugify(a.name) in slugs]
    if not matched:
        # El grupo existe pero no corresponde a ninguna área conocida.
        return ROLE_USER, []
    return ROLE_AREA_ADMIN, matched


def sync_user(identity):
    """
    Provisiona o actualiza el usuario local a partir de la identidad de
    Authelia. Authelia manda: el rol y las áreas se sobrescriben en cada
    login para reflejar los grupos actuales.
    """
    role, areas = resolve_role_and_areas(identity['groups'])

    user = User.query.filter_by(email=identity['email']).first()
    created = False
    if not user:
        user = User(
            name=identity['name'],
            email=identity['email'],
            role=role,
            status='Activo',
        )
        db.session.add(user)
        created = True
    else:
        user.name = identity['name'] or user.name
        user.role = role

    # El rol de área deriva de los grupos; se resincroniza siempre.
    if role == ROLE_AREA_ADMIN:
        user.areas = areas

    db.session.commit()
    return user, created
