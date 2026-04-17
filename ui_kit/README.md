# Nexus UI Kit - Portfolio DNA

Kit portátil de diseño y lógica UI extraído del proyecto Nexus Portal. Úsalo para mantener la misma experiencia "Premium" (validaciones con animaciones, modales glassmorphism y diseño moderno) en cualquier nuevo proyecto.

## 🚀 Instalación en un nuevo proyecto

1. Copia `nexus-core.css` y `nexus-ui.js` a tu carpeta de archivos estáticos (ej: `public/css/` y `public/js/`).
2. Asegúrate de incluir **SweetAlert2** y **FontAwesome** en tu HTML:
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
   <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
   ```
3. Importa los archivos del kit:
   ```html
   <link rel="stylesheet" href="/css/nexus-core.css">
   <script src="/js/nexus-ui.js"></script>
   ```

## ✨ Características Principales

### 1. Validación Inteligente (Cero código extra)
Simplemente añade el atributo `data-nexus-validate` a cualquier formulario. El kit se encargará de interceptar el envío, validar los campos `required`, aplicar la **animación de sacudida (shake)** y mostrar un aviso visual.

```html
<form data-nexus-validate action="/api/save" method="POST">
    <div class="input-group">
        <label>Nombre:</label>
        <input type="text" name="name" required>
    </div>
    <button type="submit" class="btn btn-primary">Guardar</button>
</form>
```

### 2. Modales "Glassmorphism" Premium
Usa la clase `.modal-overlay` y `.modal-content` para modales que se desenfocan con el fondo y tienen entrada suave.

```html
<div id="miModal" class="modal-overlay">
    <div class="modal-content">
        <h3>Mi Modal</h3>
        <p>Contenido premium...</p>
        <button onclick="closeNexusModal('miModal')" class="btn">Cerrar</button>
    </div>
</div>

<button onclick="openNexusModal('miModal')" class="btn btn-primary">Abrir Modal</button>
```

### 3. Sistema de Toasts (Notificaciones)
El objeto `window.Toast` ya está configurado con la posición, colores y animaciones del Nexus Portal.

```javascript
// Úsalo en cualquier parte de tu JS:
Toast.fire({
    icon: 'success', // 'success', 'error', 'warning', 'info'
    title: 'Operación completada con éxito'
});
```

### 4. Sistema de Tablas Modernas
Usa la combinación de `.table-card` y `.modern-table` para tablas limpias con efectos de hover.

```html
<div class="table-card">
    <div class="table-responsive">
        <table class="modern-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Nexus Admin</td>
                    <td><span class="badge">Activo</span></td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
```

### 5. Componentes Listos
- `.btn.btn-primary`: Botón con el azul índigo característico y sombras dinámicas.
- `.stat-card.modern`: Tarjetas de estadísticas con efecto de elevación en hover.
- `[data-theme="dark"]`: Añade este atributo al `<html>` para activar el modo oscuro instantáneamente.
