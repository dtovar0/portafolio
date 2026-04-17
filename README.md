# Portafolio Profesional en Flask

Este es un proyecto base para un portafolio web moderno utilizando Flask como backend y un frontend de alta estética con HTML, CSS vainilla y Javascript (modularizados).

## Estructura del Proyecto

```text
portafolio/
├── app.py              # Punto de entrada de Flask
├── static/             # Archivos estáticos
│   ├── css/
│   │   └── style.css   # Estilos premium CSS3
│   └── js/
│       └── script.js   # Interactividad moderna
├── templates/          # Plantillas Jinja2
│   ├── base.html       # Layout base modular
│   └── index.html      # Página principal
├── README.md           # Documentación
└── requirements.txt    # Dependencias de Python
```

## Instalación y Ejecución

Rápida puesta en marcha:

1. **Crear entorno virtual (Opcional pero recomendado)**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # venv\Scripts\activate   # Windows
   ```

2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar el servidor**:
   ```bash
   python app.py
   ```

El proyecto estará disponible en `http://127.0.0.1:5000`.
