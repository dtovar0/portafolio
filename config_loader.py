"""
Carga de configuración de Nexus Access.

Precedencia (de mayor a menor):
  1. Variables de entorno reales (systemd, Docker, CI)
  2. Archivo .env
  3. Archivo config.conf (formato INI heredado)
  4. Valores por defecto

config.conf se mantiene para no romper instalaciones existentes ni el
instalador web, pero .env es el formato preferido: es el mismo que usa el
frontend Next.js y el que esperan los despliegues en contenedor.
"""
import os
import configparser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, '.env')
CONF_PATH = os.path.join(BASE_DIR, 'config.conf')

# Mapa: nombre en .env -> (sección INI, clave INI, valor por defecto)
_MAPPING = {
    'DB_USER':       ('DATABASE', 'DB_USER', 'root'),
    'DB_PASS':       ('DATABASE', 'DB_PASS', ''),
    'DB_HOST':       ('DATABASE', 'DB_HOST', 'localhost'),
    'DB_PORT':       ('DATABASE', 'DB_PORT', '3306'),
    'DB_NAME':       ('DATABASE', 'DB_NAME', 'nexus'),
    'SECRET_KEY':    ('SYSTEM',   'SECRET_KEY', 'dev-key-nexus-2026'),
    'DEBUG':         ('SYSTEM',   'DEBUG', 'False'),
    'AUTHELIA_ENABLED':      ('AUTHELIA', 'ENABLED', 'False'),
    'AUTHELIA_TRUSTED_IPS':  ('AUTHELIA', 'TRUSTED_IPS', ''),
    'LOCAL_LOGIN_FALLBACK':  ('AUTHELIA', 'LOCAL_LOGIN_FALLBACK', 'True'),
    'REDIS_ENABLED': ('REDIS', 'REDIS_ENABLED', 'False'),
    'REDIS_HOST':    ('REDIS', 'REDIS_HOST', 'localhost'),
    'REDIS_PORT':    ('REDIS', 'REDIS_PORT', '6379'),
}

_TRUTHY = {'1', 'true', 'yes', 'on', 'si', 'sí'}


def _load_dotenv():
    """
    Lee .env sin sobrescribir variables de entorno ya definidas, para que el
    entorno real siempre gane. Usa python-dotenv si está disponible; si no,
    cae a un parser mínimo (KEY=VALUE, # para comentarios).
    """
    if not os.path.exists(ENV_PATH):
        return
    try:
        from dotenv import load_dotenv
        load_dotenv(ENV_PATH, override=False)
        return
    except ImportError:
        pass

    with open(ENV_PATH, 'r', encoding='utf-8') as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


class Settings:
    """Configuración resuelta, con la precedencia documentada arriba."""

    def __init__(self):
        _load_dotenv()
        self._ini = configparser.ConfigParser()
        self.has_conf = os.path.exists(CONF_PATH)
        if self.has_conf:
            self._ini.read(CONF_PATH, encoding='utf-8')

    def get(self, name):
        if name not in _MAPPING:
            raise KeyError(f'Clave de configuración desconocida: {name}')
        section, key, default = _MAPPING[name]

        # 1-2. entorno (incluye lo cargado desde .env)
        if os.environ.get(name) not in (None, ''):
            return os.environ[name]
        # 3. config.conf
        if self.has_conf and self._ini.has_option(section, key):
            value = self._ini.get(section, key)
            if value != '':
                return value
        # 4. por defecto
        return default

    def bool(self, name):
        return str(self.get(name)).strip().lower() in _TRUTHY

    def database_uri(self):
        """URI de SQLAlchemy. NEXUS_DATABASE_URI la sobrescribe por completo
        (usado por las pruebas para aislarse en SQLite)."""
        override = os.environ.get('NEXUS_DATABASE_URI')
        if override:
            return override
        user = self.get('DB_USER')
        password = self.get('DB_PASS')
        host = self.get('DB_HOST')
        port = self.get('DB_PORT')
        name = self.get('DB_NAME')
        from urllib.parse import quote_plus
        auth = quote_plus(user)
        if password:
            auth += f':{quote_plus(password)}'
        return f'mysql+pymysql://{auth}@{host}:{port}/{name}'

    def source_of(self, name):
        """De dónde salió el valor. Útil para diagnóstico."""
        section, key, _ = _MAPPING[name]
        if os.environ.get(name) not in (None, ''):
            return 'entorno/.env'
        if self.has_conf and self._ini.has_option(section, key) \
                and self._ini.get(section, key) != '':
            return 'config.conf'
        return 'por defecto'
