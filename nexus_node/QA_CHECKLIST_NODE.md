# QA Checklist Node Migration

## Preparacion
1. Levanta la app Node en `nexus_node`.
2. Usa al menos dos usuarios:
3. Usuario Administrador.
4. Usuario no Administrador con areas asignadas.

## Admin - Login y Navegacion
1. Inicia sesion con usuario Admin.
2. Verifica acceso a rutas:
3. `/`
4. `/areas`
5. `/platforms`
6. `/users`
7. `/requests`
8. `/admin/general`
9. `/admin/notifications`
10. `/admin/auth`
11. `/admin/audit`
12. Resultado esperado: todas cargan sin error 500 ni redireccion inesperada.

## Admin - Areas
1. Abre `/areas`.
2. Crear nueva area desde modal.
3. Editar un area existente.
4. Intentar eliminar un area con plataformas asociadas.
5. Eliminar un area sin plataformas asociadas.
6. Resultado esperado:
7. create/edit ok con toast de exito.
8. bloqueo de eliminacion si tiene plataformas.
9. tabla y acciones sin errores JS.

## Admin - Plataformas
1. Abre `/platforms`.
2. Crear plataforma nueva.
3. Editar plataforma existente.
4. Eliminar plataforma.
5. Resultado esperado:
6. persistencia correcta en DB.
7. mensajes de error claros si hay duplicados.
8. UI estable sin modales rotos.

## Admin - Usuarios
1. Abre `/users`.
2. Crear usuario con correo nuevo.
3. Editar rol/estado y areas asignadas.
4. Eliminar usuario.
5. Resultado esperado:
6. validacion de correo duplicado.
7. asignacion de areas guardada.
8. sin errores 500.

## Admin - Solicitudes
1. Abre `/requests`.
2. Aprobar solicitud pendiente.
3. Rechazar solicitud pendiente.
4. Resultado esperado:
5. estado cambia en lista.
6. aparece processed_at en DB.

## Admin - Configuracion
1. `/admin/general`: guardar cambios y probar DB.
2. `/admin/notifications`: guardar SMTP/template y probar correo.
3. `/admin/auth`: guardar LDAP y probar LDAP.
4. Resultado esperado:
5. endpoints responden JSON success.
6. settings persiste en `system_settings`.

## Admin - Auditoria
1. Abre `/admin/audit`.
2. Confirma que lista eventos ordenados por fecha descendente.
3. Resultado esperado: tabla visible con datos o estado vacio controlado.

## Usuario No Admin - Permisos y Catalogo
1. Inicia sesion con usuario no admin.
2. Navega a `/`.
3. Resultado esperado: redireccion a `/catalogo`.
4. Intenta abrir rutas admin directas (`/areas`, `/users`, `/admin/general`).
5. Resultado esperado: redireccion a `/catalogo`.
6. En `/catalogo`, solicita acceso a plataforma no aprobada.
7. Resultado esperado: crea solicitud pendiente.
8. Si hay plataforma aprobada, boton Lanzar abre `/platform/visit/:id` y redirige a enlace.

## Busqueda Global
1. En layout admin, usa buscador global.
2. Buscar por nombre de area, plataforma y usuario.
3. Resultado esperado: resultados agrupados y links navegables.

## Regresion Basica
1. Logout funciona desde widget de usuario.
2. Sesion expirada/token invalido redirige a `/login`.
3. No hay errores JS en consola al abrir modales principales.
4. No hay endpoints 404 en acciones de botones principales.

## Cierre
1. Marcar cada item como Pass/Fail.
2. Si hay Fail, registrar:
3. ruta
4. accion
5. payload
6. error exacto
7. evidencia (captura o log)
