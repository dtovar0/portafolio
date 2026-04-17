import os
import sys
import getpass
import pymysql
import secrets
from werkzeug.security import generate_password_hash

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def setup_web_server():
    print("\n--- CONFIGURACIÓN DEL SERVIDOR WEB (REVERSE PROXY) ---")
    has_web_server = input("¿Ya tiene instalado Nginx o Apache? [s/N]: ").lower() == 's'
    
    server_choice = "apache"
    if not has_web_server:
        want_install = input("¿Desea instalar uno ahora? [S/n]: ").lower() != 'n'
        if want_install:
            print("\nSeleccione el servidor web:")
            print("1. Apache (por defecto)")
            print("2. Nginx")
            choice = input("Opción [1]: ")
            if choice == "2":
                server_choice = "nginx"
            
            print(f"\n[!] Nota: Para instalar {server_choice}, usualmente se requiere privilegios de administrador.")
            print(f"    Comando recomendado: sudo apt update && sudo apt install {server_choice}")
        else:
            print("[*] Se generarán ambos archivos de configuración por si los necesita después.")
    else:
        print("\nSeleccione cuál tiene instalado:")
        print("1. Apache")
        print("2. Nginx")
        choice = input("Opción [1]: ")
        if choice == "2":
            server_choice = "nginx"

    domain = input("\nIngrese el dominio o IP para la configuración [localhost]: ") or "localhost"
    
    current_user = getpass.getuser()
    current_path = os.path.dirname(os.path.abspath(__file__))
    
    # Generate Files from templates in setup/
    if not os.path.exists('setup'):
        os.makedirs('setup')
        print("[!] Advertencia: No se encontró la carpeta 'setup'. Se creó una nueva.")

    # Nginx Config
    nginx_tpl = os.path.join(current_path, 'setup', 'nginx_template.conf')
    if os.path.exists(nginx_tpl):
        with open(nginx_tpl, 'r') as f:
            nginx_conf = f.read().replace("{domain}", domain).replace("{path}", current_path)
        with open('setup/nexus-nginx.conf', 'w') as f:
            f.write(nginx_conf)
    else:
        print("[!] Advertencia: No se encontró setup/nginx_template.conf")

    # Apache Config
    apache_tpl = os.path.join(current_path, 'setup', 'apache_template.conf')
    if os.path.exists(apache_tpl):
        with open(apache_tpl, 'r') as f:
            apache_conf = f.read().replace("{domain}", domain).replace("{path}", current_path)
        with open('setup/nexus-apache.conf', 'w') as f:
            f.write(apache_conf)
    else:
        print("[!] Advertencia: No se encontró setup/apache_template.conf")

    # Systemd Service
    service_tpl = os.path.join(current_path, 'setup', 'service_template.service')
    if os.path.exists(service_tpl):
        with open(service_tpl, 'r') as f:
            service_conf = f.read().replace("{user}", current_user).replace("{path}", current_path)
        with open('setup/nexus.service', 'w') as f:
            f.write(service_conf)
    else:
        print("[!] Advertencia: No se encontró setup/service_template.service")
        
    print(f"\n[+] Archivos de configuración generados en la carpeta 'setup/':")
    print(f"    - nexus-apache.conf")
    print(f"    - nexus-nginx.conf")
    print(f"    - nexus.service")
    print(f"\n[!] Al finalizar, mueva los archivos a sus respectivas carpetas:")
    if server_choice == 'nginx':
        print(f"    sudo cp setup/nexus-nginx.conf /etc/nginx/sites-available/nexus")
        print(f"    sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/")
    else:
        print(f"    sudo cp setup/nexus-apache.conf /etc/apache2/sites-available/nexus.conf")
        print(f"    sudo a2ensite nexus.conf && sudo a2enmod proxy proxy_http")
    
    print(f"    sudo cp setup/nexus.service /etc/systemd/system/nexus.service")
    print(f"    sudo systemctl daemon-reload")

def main():
    clear_screen()
    print("========================================")
    print("   NEXUS ACCESS - ASISTENTE DE INSTALACIÓN")
    print("========================================")
    
    # 0. Web Server Setup (Before DB)
    setup_web_server()
    
    print("\n========================================")
    print("   CONTINUANDO CON LA INSTALACIÓN")
    print("========================================")
    print("\nEste script configurará la base de datos y creará el usuario administrador.\n")

    # 1. Database Connection Info
    host = input("Host de la base de datos [localhost]: ") or "localhost"
    try:
        user = input("Usuario de la base de datos: ")
        if not user:
            print("Error: El usuario es obligatorio.")
            return
        
        password = getpass.getpass("Contraseña de la base de datos: ")
        db_name = input("Nombre de la base de datos [nexus]: ") or "nexus"
    except KeyboardInterrupt:
        print("\nInstalación cancelada.")
        return

    # 2. Test Connection and Create DB
    try:
        connection = pymysql.connect(host=host, user=user, password=password)
        with connection.cursor() as cursor:
            # Check if database exists
            cursor.execute(f"SHOW DATABASES LIKE '{db_name}'")
            exists = cursor.fetchone()
            
            if exists:
                print(f"\n[!] ADVERTENCIA: La base de datos '{db_name}' ya existe.")
                confirm = input(f"¿Desea ELIMINARLA y crear una nueva desde cero? (Se borrarán todos los datos) [s/N]: ").lower()
                
                if confirm == 's':
                    print(f"[+] Eliminando base de datos existente...")
                    cursor.execute(f"DROP DATABASE {db_name}")
                    print(f"[+] Creando nueva base de datos '{db_name}'...")
                    cursor.execute(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                else:
                    print("\n[!] Instalación cancelada para proteger los datos existentes.")
                    connection.close()
                    return
            else:
                print(f"\n[+] Creando base de datos '{db_name}'...")
                cursor.execute(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        connection.close()
    except Exception as e:
        print(f"\n[!] Error conectando a MySQL o gestionando la base de datos: {e}")
        return

    # 3. Import Schema
    try:
        connection = pymysql.connect(host=host, user=user, password=password, database=db_name)
        with connection.cursor() as cursor:
            print("[+] Importando estructura de tablas (schema.sql)...")
            if os.path.exists('schema.sql'):
                with open('schema.sql', 'r', encoding='utf-8') as f:
                    sql_commands = f.read().split(';')
                    for command in sql_commands:
                        if command.strip():
                            cursor.execute(command)
            else:
                print("[!] Advertencia: No se encontró schema.sql")
    except Exception as e:
        print(f"\n[!] Error importando schema: {e}")
        return

    # 4. Create Admin User
    print("\n--- CONFIGURACIÓN DEL ADMINISTRADOR ---")
    admin_name = input("Nombre completo del admin [Admin Nexus]: ") or "Admin Nexus"
    admin_email = input("Correo electrónico del admin [admin@nexus.local]: ") or "admin@nexus.local"
    
    while True:
        admin_pass = getpass.getpass("Contraseña para el panel Nexus (Admin): ")
        confirm_pass = getpass.getpass("Confirme la contraseña: ")
        
        if admin_pass == confirm_pass:
            if len(admin_pass) < 6:
                print("[!] La contraseña debe tener al menos 6 caracteres.")
                continue
            break
        else:
            print("[!] Las contraseñas no coinciden. Intente de nuevo.")

    try:
        with connection.cursor() as cursor:
            print("[+] Registrando usuario administrador...")
            pass_hash = generate_password_hash(admin_pass)
            
            # Check if user table exists before inserting
            cursor.execute("SHOW TABLES LIKE 'user'")
            if cursor.fetchone():
                cursor.execute("SELECT id FROM user WHERE email = %s", (admin_email,))
                if cursor.fetchone():
                    cursor.execute("UPDATE user SET name = %s, password_hash = %s, role = 'Administrador', status = 'Activo' WHERE email = %s", 
                                   (admin_name, pass_hash, admin_email))
                else:
                    cursor.execute("INSERT INTO user (name, email, role, status, password_hash) VALUES (%s, %s, 'Administrador', 'Activo', %s)",
                                   (admin_name, admin_email, pass_hash))
            else:
                print("[!] Error: La tabla 'user' no existe. Asegúrese de que schema.sql es correcto.")
            
            connection.commit()
    except Exception as e:
        print(f"\n[!] Error creando administrador: {e}")
        return
    finally:
        connection.close()

    # 5. Generate config.conf
    try:
        # Redis Setup
        print("\n--- CONFIGURACIÓN DE REDIS ---")
        use_redis = input("¿Desea habilitar Redis para caché/sesiones? [s/N]: ").lower() == 's'
        redis_host = "localhost"
        redis_port = "6379"
        if use_redis:
            redis_host = input("Host de Redis [localhost]: ") or "localhost"
            redis_port = input("Puerto de Redis [6379]: ") or "6379"

        secret_key = secrets.token_hex(24)
        print("\n[+] Generando archivo de configuración (config.conf)...")
        with open('config.conf', 'w', encoding='utf-8') as config_file:
            config_file.write("[DATABASE]\n")
            config_file.write(f"DB_USER = {user}\n")
            config_file.write(f"DB_PASS = {password}\n")
            config_file.write(f"DB_HOST = {host}\n")
            config_file.write(f"DB_NAME = {db_name}\n\n")
            
            config_file.write("[REDIS]\n")
            config_file.write(f"REDIS_ENABLED = {'True' if use_redis else 'False'}\n")
            config_file.write(f"REDIS_HOST = {redis_host}\n")
            config_file.write(f"REDIS_PORT = {redis_port}\n\n")
            
            config_file.write("[SYSTEM]\n")
            config_file.write(f"SECRET_KEY = {secret_key}\n")
            config_file.write("DEBUG = False\n")
            
        # Create logs folder
        if not os.path.exists('logs'):
            os.makedirs('logs')
            print("[+] Carpeta 'logs/' creada para registros del servidor.")

    except Exception as e:
        print(f"\n[!] Error generando configuración: {e}")
        return

    # 6. Final message
    print("\n========================================")
    print("   ¡INSTALACIÓN COMPLETADA CON ÉXITO!")
    print("========================================")
    print(f"\nSe ha configurado la base de datos '{db_name}' en '{host}'.")
    print(f"Usuario Admin: {admin_email}")
    print("\nArchivo 'config.conf' generado correctamente.")
    print("\nConfiguraciones de servidor generadas en la carpeta 'setup/'.")
    print("\nPróximos pasos:")
    print("1. Ejecute el script de automatización para configurar el servidor (Requiere sudo):")
    print("   sudo ./setup/configure_server.sh")
    print("\nO hágalo manualmente usando los archivos en 'setup/'.")
    print("========================================\n")

if __name__ == "__main__":
    main()

if __name__ == "__main__":
    main()
