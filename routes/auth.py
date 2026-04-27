import os
import jwt
import secrets
import pymysql
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, redirect, url_for, jsonify, current_app, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, SystemSettings
from utils_nexus import SecretManager

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()
        
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            token = jwt.encode({
                'user_id': user.id,
                'role': user.role,
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, current_app.config['SECRET_KEY'], algorithm="HS256")
            
            resp = make_response(redirect(url_for('catalog.index')))
            resp.set_cookie('token', token, httponly=True, samesite='Strict')
            return resp
            
        return render_template('login.html', error="Credenciales inválidas")
        
    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    resp = make_response(redirect(url_for('auth.login')))
    resp.set_cookie('token', '', expires=0)
    return resp

@auth_bp.route('/install', methods=['GET', 'POST'])
def web_installer():
    config_path = os.path.join(current_app.root_path, 'config.conf')
    if os.path.exists(config_path):
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        db_host = request.form.get('db_host', 'localhost')
        db_user = request.form.get('db_user')
        db_pass = request.form.get('db_pass', '')
        db_name = request.form.get('db_name', 'nexus')
        drop_db = request.form.get('drop_db') == 'on'
        
        admin_name = request.form.get('admin_name', 'Admin Nexus')
        admin_email = request.form.get('admin_email', 'admin@nexus.local')
        admin_pass = request.form.get('admin_pass')
        
        if not db_user or not admin_pass or len(admin_pass) < 6:
            return render_template('install.html', error="Faltan datos obligatorios o la contraseña es muy corta.")

        try:
            conn = pymysql.connect(host=db_host, user=db_user, password=db_pass)
            with conn.cursor() as cursor:
                cursor.execute(f"SHOW DATABASES LIKE '{db_name}'")
                if cursor.fetchone():
                    if not drop_db:
                        return render_template('install.html', error=f"La base de datos '{db_name}' ya existe. Marque la casilla para borrarla.")
                    cursor.execute(f"DROP DATABASE {db_name}")
                cursor.execute(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            conn.close()

            conn = pymysql.connect(host=db_host, user=db_user, password=db_pass, database=db_name)
            with conn.cursor() as cursor:
                schema_path = os.path.join(current_app.root_path, 'schema.sql')
                if os.path.exists(schema_path):
                    with open(schema_path, 'r', encoding='utf-8') as f:
                        sql_cmds = f.read().split(';')
                        for cmd in sql_cmds:
                            if cmd.strip():
                                cursor.execute(cmd)
                
                pass_hash = generate_password_hash(admin_pass)
                cursor.execute("INSERT INTO user (name, email, role, status, password_hash) VALUES (%s, %s, 'Administrador', 'Activo', %s)",
                               (admin_name, admin_email, pass_hash))
            conn.commit()
            conn.close()

            sec_key = secrets.token_hex(24)
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write("[DATABASE]\n")
                f.write(f"DB_USER = {db_user}\n")
                f.write(f"DB_PASS = {db_pass}\n")
                f.write(f"DB_HOST = {db_host}\n")
                f.write(f"DB_NAME = {db_name}\n\n")
                f.write("[SYSTEM]\n")
                f.write(f"SECRET_KEY = {sec_key}\n")
                f.write("DEBUG = False\n")

            return render_template('install.html', success="¡Instalación completada con éxito!")
        except Exception as e:
            return render_template('install.html', error=f"Error durante la instalación: {str(e)}")
            
    return render_template('install.html')
