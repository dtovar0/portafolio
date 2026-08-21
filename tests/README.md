# Tests

## test_scope.py — alcance por área

Verifica la autorización por rol y el alcance por área de la API contra una
base SQLite aislada (nunca toca MySQL).

```bash
NEXUS_DATABASE_URI="sqlite:////tmp/nexus_test.db" \
  venv/bin/python tests/test_scope.py
```

Cubre 41 aserciones: acceso anónimo, superadmin sin restricción, admin de área
limitado a sus áreas (lectura y escritura), usuario final restringido al
catálogo, y preservación de la membresía de áreas ajenas al editar usuarios.

El `assert` inicial aborta si `NEXUS_DATABASE_URI` no apunta a SQLite, para
evitar escribir datos de prueba en la base real.
