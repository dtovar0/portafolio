"""Verificación del alcance por área contra una SQLite en memoria."""
import os, sys, jwt
from datetime import datetime, timedelta
sys.path.insert(0, '/home/dtovar/bayblade/portafolio')

os.environ['NEXUS_TEST'] = '1'
from app import create_app
from models import db, User, Area, Platform, AccessRequest
from utils_authz import ROLE_SUPERADMIN, ROLE_AREA_ADMIN, ROLE_USER

app = create_app()
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
app.config['WTF_CSRF_ENABLED'] = False
app.config['AUTHELIA_ENABLED'] = False

# Reinicializar el engine para que tome SQLite
with app.app_context():
    db.engine.dispose()

with app.app_context():
    db.create_all()

    fin = Area(name='Finanzas'); rh = Area(name='Recursos Humanos'); it = Area(name='TI')
    db.session.add_all([fin, rh, it]); db.session.commit()

    p_fin = Platform(name='SAP', description='ERP', area_id=fin.id, direct_link='http://sap')
    p_rh  = Platform(name='Nomina', description='Payroll', area_id=rh.id)
    p_it  = Platform(name='Jira', description='Tickets', area_id=it.id)
    db.session.add_all([p_fin, p_rh, p_it]); db.session.commit()

    su = User(name='Super', email='su@x.com', role=ROLE_SUPERADMIN, status='Activo')
    aa = User(name='AdminFin', email='af@x.com', role=ROLE_AREA_ADMIN, status='Activo')
    us = User(name='Juan', email='juan@x.com', role=ROLE_USER, status='Activo')
    db.session.add_all([su, aa, us]); db.session.commit()
    aa.areas = [fin]        # admin solo de Finanzas
    us.areas = [rh]         # usuario normal en RH
    db.session.commit()

    r_fin = AccessRequest(platform_id=p_fin.id, user_id=us.id, status='Pendiente')
    r_rh  = AccessRequest(platform_id=p_rh.id,  user_id=us.id, status='Pendiente')
    db.session.add_all([r_fin, r_rh]); db.session.commit()

    key = app.config['SECRET_KEY']
    ids = {'su': su.id, 'aa': aa.id, 'us': us.id,
           'fin': fin.id, 'rh': rh.id, 'it': it.id,
           'p_fin': p_fin.id, 'p_rh': p_rh.id, 'p_it': p_it.id,
           'r_fin': r_fin.id, 'r_rh': r_rh.id}

def tok(uid):
    return jwt.encode({'user_id': uid, 'exp': datetime.utcnow()+timedelta(hours=1)}, key, algorithm='HS256')

def client_for(uid):
    c = app.test_client()
    c.set_cookie('token', tok(uid))
    return c

PASS, FAIL = [], []
def check(desc, got, want):
    (PASS if got == want else FAIL).append((desc, got, want))

with app.app_context():
    su_c, aa_c, us_c = client_for(ids['su']), client_for(ids['aa']), client_for(ids['us'])
    anon = app.test_client()

    print("="*68); print("ANONIMO"); print("="*68)
    for path in ['/api/me', '/api/dashboard', '/api/areas', '/api/users']:
        r = anon.get(path); check(f'anon {path} = 401', r.status_code, 401)
        print(f'  {path:20} -> {r.status_code}')

    print("="*68); print("SUPERADMIN (ve todo)"); print("="*68)
    r = su_c.get('/api/areas'); n = len(r.get_json()['areas'])
    check('su ve 3 areas', n, 3); print(f'  /api/areas          -> {r.status_code}, {n} areas')
    r = su_c.get('/api/platforms'); n = len(r.get_json()['platforms'])
    check('su ve 3 plataformas', n, 3); print(f'  /api/platforms      -> {r.status_code}, {n} plataformas')
    r = su_c.get('/api/requests'); n = len(r.get_json()['requests'])
    check('su ve 2 solicitudes', n, 2); print(f'  /api/requests       -> {r.status_code}, {n} solicitudes')
    r = su_c.get('/api/me'); perms = r.get_json()['permissions']
    check('su scope=None', perms['scoped_area_ids'], None)
    print(f"  /api/me             -> scope={perms['scoped_area_ids']} (None = sin limite)")

    print("="*68); print("ADMIN DE AREA (solo Finanzas)"); print("="*68)
    r = aa_c.get('/api/areas'); areas = r.get_json()['areas']
    check('aa ve 1 area', len(areas), 1)
    check('aa ve Finanzas', areas[0]['name'], 'Finanzas')
    print(f"  /api/areas          -> {r.status_code}, {[a['name'] for a in areas]}")
    r = aa_c.get('/api/platforms'); pl = r.get_json()['platforms']
    check('aa ve 1 plataforma', len(pl), 1)
    check('aa ve SAP', pl[0]['name'], 'SAP')
    print(f"  /api/platforms      -> {r.status_code}, {[p['name'] for p in pl]}")
    r = aa_c.get('/api/requests'); rq = r.get_json()['requests']
    check('aa ve 1 solicitud', len(rq), 1)
    check('aa ve solicitud de SAP', rq[0]['platform_name'], 'SAP')
    print(f"  /api/requests       -> {r.status_code}, {[x['platform_name'] for x in rq]}")

    # Ve todos los usuarios, pero solo edita los suyos
    r = aa_c.get('/api/users'); us_list = r.get_json()['users']
    check('aa ve los 3 usuarios', len(us_list), 3)
    ed = {u['email']: u['editable'] for u in us_list}
    check('aa NO edita a Juan (RH)', ed['juan@x.com'], False)
    check('aa NO edita al superadmin', ed['su@x.com'], False)
    print(f"  /api/users          -> {r.status_code}, ve {len(us_list)}, editables={[e for e,v in ed.items() if v]}")

    print("="*68); print("ADMIN DE AREA: intentos fuera de alcance"); print("="*68)
    r = aa_c.put(f"/api/platforms/{ids['p_rh']}", json={'name':'Hackeado'})
    check('aa no edita plataforma de RH', r.status_code, 403)
    print(f"  PUT plataforma RH        -> {r.status_code} {r.get_json().get('error','')}")
    r = aa_c.delete(f"/api/platforms/{ids['p_it']}")
    check('aa no borra plataforma de TI', r.status_code, 403)
    print(f"  DELETE plataforma TI     -> {r.status_code} {r.get_json().get('error','')}")
    r = aa_c.post(f"/api/requests/{ids['r_rh']}/approve")
    check('aa no aprueba solicitud RH', r.status_code, 403)
    print(f"  APPROVE solicitud RH     -> {r.status_code} {r.get_json().get('error','')}")
    r = aa_c.post('/api/platforms', json={'name':'X','description':'d','area_id':ids['rh']})
    check('aa no crea plataforma en RH', r.status_code, 403)
    print(f"  POST plataforma en RH    -> {r.status_code} {r.get_json().get('error','')}")
    r = aa_c.post('/api/areas', json={'name':'Nueva'})
    check('aa no crea areas', r.status_code, 403)
    print(f"  POST area nueva          -> {r.status_code} {r.get_json().get('error','')}")
    r = aa_c.get('/api/settings')
    check('aa no ve ajustes', r.status_code, 403)
    print(f"  GET /api/settings        -> {r.status_code} {r.get_json().get('error','')}")
    r = aa_c.delete(f"/api/users/{ids['us']}")
    check('aa no borra usuarios', r.status_code, 403)
    print(f"  DELETE usuario           -> {r.status_code} {r.get_json().get('error','')}")
    r = aa_c.post('/api/users', json={'name':'N','email':'n@x.com','role':ROLE_SUPERADMIN})
    check('aa no crea superadmins', r.status_code, 403)
    print(f"  POST usuario superadmin  -> {r.status_code} {r.get_json().get('error','')}")

    print("="*68); print("ADMIN DE AREA: acciones permitidas"); print("="*68)
    r = aa_c.put(f"/api/platforms/{ids['p_fin']}", json={'owner':'Tesoreria'})
    check('aa SI edita plataforma de Finanzas', r.status_code, 200)
    print(f"  PUT plataforma Finanzas  -> {r.status_code}")
    r = aa_c.post('/api/platforms', json={'name':'Bancos','description':'Portal','area_id':ids['fin']})
    check('aa SI crea plataforma en Finanzas', r.status_code, 201)
    print(f"  POST plataforma Finanzas -> {r.status_code}")
    r = aa_c.post(f"/api/requests/{ids['r_fin']}/approve")
    check('aa SI aprueba solicitud de Finanzas', r.status_code, 200)
    print(f"  APPROVE solicitud SAP    -> {r.status_code}")

    print("="*68); print("USUARIO NORMAL"); print("="*68)
    for path in ['/api/dashboard','/api/areas','/api/platforms','/api/users','/api/requests','/api/settings','/api/audit']:
        r = us_c.get(path); check(f'user {path} = 403', r.status_code, 403)
        print(f'  {path:20} -> {r.status_code}')
    r = us_c.get('/api/catalog'); j = r.get_json()
    check('user accede al catalogo', r.status_code, 200)
    print(f"  /api/catalog         -> {r.status_code}, {len(j['platforms'])} plataformas")
    acc = {p['name']: p['has_access'] for p in j['platforms']}
    check('user tiene acceso a Nomina (su area RH)', acc['Nomina'], True)
    check('user tiene acceso a SAP (aprobado)', acc['SAP'], True)
    check('user NO tiene acceso a Jira', acc['Jira'], False)
    print(f"  accesos: {acc}")
    r = us_c.get('/api/requests/mine')
    check('user ve sus solicitudes', r.status_code, 200)
    print(f"  /api/requests/mine   -> {r.status_code}, {len(r.get_json()['requests'])} propias")

    print("="*68); print("REGLA: preservar areas ajenas al editar"); print("="*68)
    # Juan esta en RH. El admin de Finanzas lo agrega a Finanzas: RH debe sobrevivir.
    juan = User.query.filter_by(email='juan@x.com').first()
    juan.areas = [Area.query.get(ids['rh']), Area.query.get(ids['fin'])]
    db.session.commit()
    r = aa_c.put(f"/api/users/{ids['us']}", json={'area_ids': []})
    if r.status_code == 200:
        juan = User.query.filter_by(email='juan@x.com').first()
        names = sorted(a.name for a in juan.areas)
        check('RH se preserva al quitar Finanzas', names, ['Recursos Humanos'])
        print(f"  aa quita Finanzas a Juan -> areas restantes: {names}")
    else:
        FAIL.append(('editar Juan tras compartir area', r.status_code, 200))
        print(f"  PUT usuario -> {r.status_code} {r.get_json().get('error','')}")

print()
print("="*68)
print(f"RESULTADO: {len(PASS)} PASS / {len(FAIL)} FAIL")
print("="*68)
for d,g_,w in FAIL:
    print(f"  FAIL: {d}  (obtenido={g_}, esperado={w})")
sys.exit(1 if FAIL else 0)
