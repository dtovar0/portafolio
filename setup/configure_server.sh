#!/bin/bash

# Script de configuración automática para Nexus Access
# Este script debe ejecutarse con sudo

if [[ $EUID -ne 0 ]]; then
   echo "Este script debe ejecutarse con sudo o como root" 
   exit 1
fi

echo "========================================"
echo "   CONFIGURADOR DE SERVIDOR - NEXUS"
echo "========================================"

# Detectar servidor deseado
echo "Seleccione el servidor que desea configurar:"
echo "1) Apache"
echo "2) Nginx"
read -p "Opción [1-2]: " choice

SERVER_TYPE="apache"
if [[ "$choice" == "2" ]]; then
    SERVER_TYPE="nginx"
fi

echo "[+] Instalando $SERVER_TYPE..."
apt update
if [[ "$SERVER_TYPE" == "apache" ]]; then
    apt install -y apache2
    # Habilitar módulos necesarios
    a2enmod proxy proxy_http rewrite headers
else
    apt install -y nginx
fi

# Obtener la ruta del script y del proyecto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# 1. Configurar el servicio Systemd
echo "[+] Configurando servicio systemd (nexus.service)..."
if [[ -f "$SCRIPT_DIR/nexus.service" ]]; then
    cp "$SCRIPT_DIR/nexus.service" /etc/systemd/system/nexus.service
    systemctl daemon-reload
    systemctl enable nexus
    systemctl restart nexus
    echo "    - Servicio nexus iniciado y habilitado."
else
    echo "    [!] Error: No se encontró $SCRIPT_DIR/nexus.service. Ejecute install.py primero."
    exit 1
fi

# 2. Configurar el Servidor Web
if [[ "$SERVER_TYPE" == "apache" ]]; then
    echo "[+] Configurando Apache..."
    if [[ -f "$SCRIPT_DIR/nexus-apache.conf" ]]; then
        cp "$SCRIPT_DIR/nexus-apache.conf" /etc/apache2/sites-available/nexus.conf
        a2ensite nexus.conf
        # Deshabilitar default si es necesario (opcional)
        # a2dissite 000-default.conf
        systemctl restart apache2
        echo "    - Apache configurado y reiniciado."
    else
        echo "    [!] Error: No se encontró setup/nexus-apache.conf"
    fi
else
    echo "[+] Configurando Nginx..."
    if [[ -f "$SCRIPT_DIR/nexus-nginx.conf" ]]; then
        cp "$SCRIPT_DIR/nexus-nginx.conf" /etc/nginx/sites-available/nexus
        ln -sf /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
        # Eliminar default si existe
        rm -f /etc/nginx/sites-enabled/default
        nginx -t && systemctl restart nginx
        echo "    - Nginx configurado y reiniciado."
    else
        echo "    [!] Error: No se encontró setup/nexus-nginx.conf"
    fi
fi

echo "========================================"
echo "   CONFIGURACIÓN COMPLETADA"
echo "========================================"
echo "La aplicación debería estar disponible en su dominio/IP."
echo "Estado del servicio: systemctl status nexus"
