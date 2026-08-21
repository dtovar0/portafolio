# Configuración

## Archivos

| Archivo | Ámbito | Versionado |
|---|---|---|
| `.env` | Flask (backend) | No — contiene secretos |
| `.env.example` | Plantilla del backend | Sí |
| `frontend/.env.local` | Next.js | No |
| `frontend/.env.example` | Plantilla del frontend | Sí |
| `config.conf` | Formato INI heredado | No |

## Precedencia

De mayor a menor prioridad:

1. **Variables de entorno reales** — systemd, Docker, CI
2. **`.env`**
3. **`config.conf`** — formato INI heredado
4. **Valores por defecto** en `config_loader.py`

`config.conf` se mantiene por compatibilidad con instalaciones existentes y
con el instalador web (`/install`), pero `.env` es el formato preferido: es el
mismo que usa el frontend y el que esperan los despliegues en contenedor.

Para saber de dónde salió un valor:

```python
from config_loader import Settings
s = Settings()
s.get('DB_NAME')        # valor resuelto
s.source_of('DB_NAME')  # 'entorno/.env' | 'config.conf' | 'por defecto'
```

## Puesta en marcha

```bash
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # para SECRET_KEY
# editar .env con las credenciales de la base y la clave generada

cd frontend && cp .env.example .env.local
```

## Claves

### Base de datos
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`

Usuario y contraseña se codifican con `quote_plus` al construir la URI, así
que admiten caracteres especiales.

`NEXUS_DATABASE_URI` sobrescribe la URI completa; lo usan las pruebas para
aislarse en SQLite.

### Sistema
- `SECRET_KEY` — firma los JWT de sesión. Si cambia, todas las sesiones
  activas caducan. La app avisa al arrancar si en producción sigue con el
  valor por defecto de desarrollo.
- `DEBUG` — activa el recargador y el depurador. Nunca en producción: el
  depurador permite ejecutar código arbitrario.

### Authelia
- `AUTHELIA_ENABLED`
- `AUTHELIA_TRUSTED_IPS` — **obligatorio** si Authelia está activo. Sin lista,
  los headers `Remote-*` se ignoran por completo (fail-closed).
- `LOCAL_LOGIN_FALLBACK` — conserva el login por contraseña como respaldo.

Ver [roles_y_alcance.md](roles_y_alcance.md) para el mapeo de grupos a roles y
las implicaciones de seguridad.

### Redis
`REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT` — declarados y leídos por el
loader, pero todavía sin uso en el código.

### Frontend
`FLASK_API_URL` — URL interna de la API. Los rewrites de `next.config.ts`
enrutan `/api/*` ahí, de modo que el navegador habla siempre con el mismo
origen: sin CORS y la cookie de sesión viaja sola.
