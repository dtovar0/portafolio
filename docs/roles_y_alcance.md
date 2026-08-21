# Roles y alcance por área

## Roles

| Rol | Alcance | Puede |
|---|---|---|
| `Administrador` | Global | Todo: crea/borra áreas y usuarios, ajustes del sistema |
| `AdministradorArea` | Sus áreas (`user_areas`) | Plataformas y solicitudes de sus áreas; ve el directorio de usuarios completo pero solo edita los de sus áreas |
| `Usuario` | Propio | Catálogo y sus propias solicitudes |

El alcance de un `AdministradorArea` se deriva de su relación `User.areas`.
No hay tabla `Tenant`: es una sola organización con administradores de alcance
limitado, no multi-tenant con aislamiento duro.

## Matriz de permisos

| Acción | Administrador | AdministradorArea | Usuario |
|---|---|---|---|
| Ver dashboard | Todo | Sus áreas | — |
| Crear área | Sí | No | — |
| Editar área | Cualquiera | Solo las suyas | — |
| Borrar área | Sí | No | — |
| Crear plataforma | Cualquier área | Solo en sus áreas | — |
| Editar/borrar plataforma | Cualquiera | Solo de sus áreas | — |
| Mover plataforma entre áreas | Sí | Solo entre sus áreas | — |
| Ver usuarios | Todos | Todos (`editable` marca cuáles puede tocar) | — |
| Crear usuario | Sí | Sí, sin rol administrativo | — |
| Editar usuario | Cualquiera | Solo los de sus áreas | — |
| Borrar usuario | Sí | No | — |
| Aprobar/rechazar solicitud | Cualquiera | Solo de sus áreas | — |
| Ajustes del sistema | Sí | No | — |
| Ver catálogo | Sí | Sí | Sí |

### Regla de membresía de áreas

Cuando un `AdministradorArea` edita las áreas de un usuario, las áreas que
quedan **fuera de su alcance se preservan intactas**. Un admin de Finanzas que
quita a alguien de Finanzas no lo saca de Recursos Humanos.
Implementado en `user_update` en `routes/api.py`.

### Salvaguardas

- No se puede degradar ni eliminar al último `Administrador` activo.
- Nadie se puede eliminar a sí mismo.
- Un `AdministradorArea` no puede otorgar roles administrativos.
- No se puede borrar un área que aún tiene plataformas.

## Authelia (forward-auth)

Los grupos de Authelia son la fuente de verdad del rol y de las áreas; se
resincronizan en cada petición.

| Grupo | Resultado |
|---|---|
| `nexus-admin` | `Administrador` |
| `nexus-area-<slug-del-área>` | `AdministradorArea` de esas áreas |
| cualquier otro / ninguno | `Usuario` |

El slug es el nombre del área en minúsculas con guiones (`Recursos Humanos` →
`recursos-humanos`). Un grupo que no corresponda a ningún área existente
degrada a `Usuario`.

### Seguridad — no opcional

Confiar en headers HTTP solo es seguro si la app es inalcanzable sin pasar por
el proxy. Dos defensas, ambas necesarias:

1. **Red**: el puerto de Flask escucha en loopback o red interna, nunca
   expuesto. El único camino público es el proxy.
2. **App**: `TRUSTED_IPS` en `config.conf` restringe qué IP de origen puede
   inyectar headers `Remote-*`. Si la lista está vacía, los headers se
   **ignoran por completo** (fail-closed).

Sin esto, cualquiera que alcance el puerto de Flask podría enviar
`Remote-Email: admin@empresa.com` y entrar como administrador.

### Precedencia de autenticación

1. **Authelia**: si el origen es de confianza y hay `Remote-Email`, esa
   identidad manda y el usuario local se sincroniza.
2. **JWT local**: fallback por cookie. El rol se lee de la base de datos, no
   del token, para que un cambio de permisos surta efecto de inmediato.

## Pruebas

```bash
NEXUS_DATABASE_URI="sqlite:////tmp/nexus_test.db" \
  venv/bin/python tests/test_scope.py
```

41 aserciones sobre alcance y permisos. Ver `tests/README.md`.
