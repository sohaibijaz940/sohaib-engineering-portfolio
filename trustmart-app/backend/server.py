import os, secrets, hashlib, re, sqlite3
from datetime import datetime, timezone, timedelta
from functools import wraps
from urllib.parse import urlparse, parse_qs
from flask import Flask, request, jsonify, send_from_directory, g
import bcrypt, pyotp
from db import connect, seed, now, ROOT
from pricing import market_average

app=Flask(__name__, static_folder=str(ROOT/'dist'))
app.config['MAX_CONTENT_LENGTH']=3*1024*1024
DEMO=os.environ.get('TRUSTMART_DEMO','1')=='1'
SECURE=os.environ.get('TRUSTMART_SECURE','0')=='1'
def error(message, status=400): return jsonify(error=message),status
def auth(*roles):
    def deco(fn):
        @wraps(fn)
        def wrapped(*a,**kw):
            token=request.cookies.get('trustmart_session','')
            with connect() as d:
                user=d.execute('SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?',(hashlib.sha256(token.encode()).hexdigest(),now())).fetchone()
            if not user:return error('Sign in to continue.',401)
            g.user=dict(user)
            if roles and user['role'] not in roles:return error('Your account does not have permission for this action.',403)
            return fn(*a,**kw)
        return wrapped
    return deco
@app.before_request
def guard():
    if request.path.startswith('/api/') and request.method not in ('GET','HEAD','OPTIONS'):
        origin=request.headers.get('Origin')
        if origin and urlparse(origin).netloc!=request.host:return error('Cross-origin request rejected.',403)
        if not request.is_json:return error('JSON request required.',415)
@app.after_request
def headers(resp):
    resp.headers['X-Content-Type-Options']='nosniff'
    resp.headers['Referrer-Policy']='same-origin'
    resp.headers['X-Frame-Options']='DENY'
    resp.headers['Permissions-Policy']='camera=(self), microphone=()'
    if request.path.startswith('/api/'):resp.headers['Cache-Control']='no-store'
    return resp
@app.errorhandler(413)
def large(_):return error('Request too large.',413)
@app.errorhandler(500)
def internal(_):return error('The server could not complete this request.',500)
@app.get('/api/health')
def health():return jsonify(ok=True,fictional=True,demo=DEMO)
@app.post('/api/register')
def register():
    b=request.get_json(); email=str(b.get('email','')).strip().lower(); name=str(b.get('name','')).strip(); password=str(b.get('password','')); role=b.get('role','Consumer')
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+',email) or len(email)>100 or not 2<=len(name)<=80 or not 12<=len(password.encode())<=72 or role not in ('Consumer','Supplier'):
        return error('Use a valid email, a name, and a 12â€“72 character password. Choose Consumer or Supplier.')
    secret=pyotp.random_base32() if role=='Supplier' else None
    try:
        with connect() as d:
            uid=d.execute('INSERT INTO users(email,name,password,role,totp,created_at) VALUES(?,?,?,?,?,?)',(email,name,bcrypt.hashpw(password.encode(),bcrypt.gensalt()),role,secret,now())).lastrowid
            if role=='Supplier':
                sid='Shop'+secrets.token_hex(5)
                shop=str(b.get('shop_name','')).strip()[:100] or name+' Components'
                market=b.get('market','Hall Road')
                if market not in ('Hall Road','Hafeez Center'):market='Hall Road'
                d.execute('INSERT INTO shops VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(sid,uid,shop,name,market,'Address awaiting review','New supplier application. Details awaiting an administrator audit.','Not supplied','Not supplied','Pending',0,'Application awaiting review.',now(),secrets.token_urlsafe(24)))
                d.execute('INSERT INTO audits(actor_id,shop_id,action,note,created_at) VALUES(?,?,?,?,?)',(uid,sid,'Pending','Supplier account registered.',now()))
    except sqlite3.IntegrityError:return error('An account with this email already exists.',409)
    return jsonify(message='Account created. Sign in to continue.',totp_secret=secret,provisioning_uri=pyotp.TOTP(secret).provisioning_uri(email,issuer_name='TrustMart') if secret else None),201
@app.post('/api/login')
def login():
    b=request.get_json(); email=str(b.get('email','')).lower().strip(); password=str(b.get('password','')); code=str(b.get('code',''))
    with connect() as d:
        since=(datetime.now(timezone.utc)-timedelta(minutes=10)).isoformat()
        fails=d.execute('SELECT count(*) FROM login_attempts WHERE (email=? OR ip=?) AND success=0 AND created_at>?',(email,request.remote_addr,since)).fetchone()[0]
        if fails>=10:return error('Too many attempts. Please wait ten minutes.',429)
        u=d.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        valid=False
        try:valid=bool(u and bcrypt.checkpw(password.encode(),u['password']))
        except ValueError:pass
        if not valid:
            d.execute('INSERT INTO login_attempts(email,ip,success,created_at) VALUES(?,?,0,?)',(email,request.remote_addr,now()))
            return error('Invalid username or password. Please try again.',401)
        if u['role']!='Consumer':
            if not re.fullmatch(r'[0-9]{6}',code):
                d.execute('INSERT INTO login_attempts(email,ip,success,created_at) VALUES(?,?,0,?)',(email,request.remote_addr,now()))
                return error('Enter a six-digit authenticator code.',401)
            totp=pyotp.TOTP(u['totp']); counter=int(datetime.now(timezone.utc).timestamp())//30
            matched=next((n for n in (counter-1,counter,counter+1) if secrets.compare_digest(totp.at(n*30),code)),None)
            if matched is None or matched<=u['last_totp']:
                d.execute('INSERT INTO login_attempts(email,ip,success,created_at) VALUES(?,?,0,?)',(email,request.remote_addr,now()))
                return error('Enter a fresh six-digit authenticator code. Used codes cannot be replayed.',401)
            d.execute('UPDATE users SET last_totp=? WHERE id=?',(matched,u['id']))
        token=secrets.token_urlsafe(32)
        d.execute('DELETE FROM sessions WHERE expires_at<=?',(now(),))
        d.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),u['id'],(datetime.now(timezone.utc)+timedelta(hours=8)).isoformat()))
        d.execute('INSERT INTO login_attempts(email,ip,success,created_at) VALUES(?,?,1,?)',(email,request.remote_addr,now()))
        resp=jsonify(user={k:u[k] for k in ('id','name','email','role')})
        resp.set_cookie('trustmart_session',token,httponly=True,secure=SECURE,samesite='Strict',max_age=8*3600)
        return resp
@app.post('/api/logout')
def logout():
    with connect() as d:d.execute('DELETE FROM sessions WHERE token=?',(hashlib.sha256(request.cookies.get('trustmart_session','').encode()).hexdigest(),))
    r=jsonify(ok=True);r.delete_cookie('trustmart_session');return r
@app.get('/api/me')
@auth()
def me():return jsonify(user=g.user)
@app.get('/api/demo-code/<role>')
def demo_code(role):
    if not DEMO or role not in ('Supplier','Admin'):return error('Not available.',404)
    with connect() as d:u=d.execute('SELECT totp FROM users WHERE email=?',(role.lower()+'@trustmart.demo',)).fetchone()
    return jsonify(code=pyotp.TOTP(u['totp']).now(),warning='Public demo code only. Disabled when TRUSTMART_DEMO=0.')
def listings(d,where='',args=()):
    return [dict(r) for r in d.execute('SELECT l.*,s.name shop_name,s.status,s.market,c.name component_name,c.model,c.category FROM listings l JOIN shops s ON s.id=l.shop_id JOIN components c ON c.id=l.component_id '+where,args)]
@app.get('/api/catalog')
@auth()
def catalog():
    with connect() as d:
        cs=[dict(r) for r in d.execute('SELECT * FROM components')]
        for c in cs:
            offers=listings(d,'WHERE l.component_id=? AND l.grade=? AND l.warranty=?',(c['id'],request.args.get('grade','Aftermarket A'),request.args.get('warranty',30)))
            c['pricing']=market_average(offers)
        return jsonify(components=cs)
@app.get('/api/components/<int:cid>')
@auth()
def component(cid):
    with connect() as d:
        c=d.execute('SELECT * FROM components WHERE id=?',(cid,)).fetchone()
        if not c:return error('Component pricing data not available at this time.',404)
        grade=request.args.get('grade','Aftermarket A'); warranty=request.args.get('warranty',30)
        offers=listings(d,'WHERE l.component_id=? AND l.grade=? AND l.warranty=?',(cid,grade,warranty))
        history=[dict(r) for r in d.execute('SELECT h.*,l.shop_id FROM price_history h JOIN listings l ON l.id=h.listing_id WHERE l.component_id=? AND l.grade=? AND l.warranty=? ORDER BY h.created_at',(cid,grade,warranty))]
        return jsonify(component=dict(c),offers=offers,pricing=market_average(offers),history=history)
@app.get('/api/shops')
@auth()
def shops():
    with connect() as d:return jsonify(shops=[dict(r) for r in d.execute('SELECT id,name,market,address,status,score,specialties,updated_at,hours,business_phone FROM shops')])
@app.get('/api/verify')
@auth()
def verify():
    code=request.args.get('code','').strip()
    if len(code)>512:return error('Invalid QR payload.')
    # Parse data only. Never navigate to or fetch a scanned URL.
    if code.startswith('trustmart-waypoint:'):
        from marketplace import location
        parts=code.split(':')
        with connect() as d:
            loc=location(d,parts[1]) if len(parts)==3 else None
            if not loc or parts[2] not in ('entrance','lift','stairs'):return error('Unknown demo waypoint.',404)
            return jsonify(location_shop_id=parts[1],waypoint=parts[2])
    if code.startswith('trustmart-item:'):
        from marketplace import product
        with connect() as d:
            p=product(d,code.removeprefix('trustmart-item:'))
            return jsonify(product_id=p['id'],revision=p['revision']) if p else error('Unknown item QR.',404)
    token=None
    if code.startswith('trustmart:'):token=code.removeprefix('trustmart:')
    elif code.startswith(('https://','http://')):
        parsed=urlparse(code)
        if parsed.path!='/verify':return error('This is not a TrustMart store QR.',400)
        token=parse_qs(parsed.query).get('token',[None])[0]
        if not token:return error('This QR has no store token.')
    with connect() as d:
        s=d.execute('SELECT * FROM shops WHERE '+('qr_token=?' if token else 'id=? COLLATE NOCASE'),(token or code,)).fetchone()
        if not s:
            d.execute('INSERT INTO audits(action,note,created_at) VALUES(?,?,?)',('Unknown lookup','Unregistered supplier query.',now()))
            return error('Supplier not registered or validated by TrustMart.',404)
        shop=dict(s); shop.pop('qr_token'); shop.pop('user_id')
        reports=[dict(r) for r in d.execute('SELECT action,note,created_at FROM audits WHERE shop_id=? ORDER BY id DESC',(s['id'],))]
        return jsonify(shop=shop,reports=reports,offers=listings(d,'WHERE l.shop_id=?',(s['id'],)),qr_payload='trustmart:'+s['qr_token'])
@app.get('/api/supplier')
@auth('Supplier')
def supplier():
    with connect() as d:
        s=d.execute('SELECT * FROM shops WHERE user_id=?',(g.user['id'],)).fetchone()
        return jsonify(shop=dict(s),offers=listings(d,'WHERE l.shop_id=?',(s['id'],)),components=[dict(r) for r in d.execute('SELECT * FROM components')])
@app.post('/api/supplier/listings')
@auth('Supplier')
def submit():
    b=request.get_json()
    try:
        cid=int(b['component_id']);price=int(b['price']);stock=int(b['stock']);warranty=int(b['warranty']);grade=b['grade']
        if not(100<=price<=100000000 and 0<=stock<=100000 and warranty in (0,7,30,90) and grade in ('Aftermarket A','Refurbished','Aftermarket B')):raise ValueError()
    except (KeyError,ValueError,TypeError):return error('Check component, price, stock, grade, and warranty values.')
    with connect() as d:
        s=d.execute('SELECT * FROM shops WHERE user_id=?',(g.user['id'],)).fetchone()
        if s['status'] not in ('Verified','Warning'):return error('This supplier cannot submit prices until approved.',403)
        if not d.execute('SELECT id FROM components WHERE id=?',(cid,)).fetchone():return error('Unknown component.')
        # Updated offers leave averages until the administrator reviews them.
        existing=d.execute('SELECT id FROM listings WHERE shop_id=? AND component_id=? AND grade=? AND warranty=?',(s['id'],cid,grade,warranty)).fetchone()
        if existing:
            lid=existing['id'];d.execute('UPDATE listings SET price=?,stock=?,approved=0,updated_at=? WHERE id=?',(price,stock,now(),lid))
        else:lid=d.execute('INSERT INTO listings(shop_id,component_id,grade,warranty,price,stock,approved,updated_at) VALUES(?,?,?,?,?,?,0,?)',(s['id'],cid,grade,warranty,price,stock,now())).lastrowid
        d.execute('INSERT INTO price_history(listing_id,price,created_at) VALUES(?,?,?)',(lid,price,now()))
        d.execute('INSERT INTO audits(actor_id,shop_id,action,note,created_at) VALUES(?,?,?,?,?)',(g.user['id'],s['id'],'Price submitted',f'Listing {lid} requires approval.',now()))
    return jsonify(message='Price saved. It is excluded from averages until an admin approves it.')
@app.get('/api/admin')
@auth('Admin')
def admin():
    with connect() as d:return jsonify(shops=[dict(r) for r in d.execute('SELECT id,name,status,reason,score,market FROM shops')],pending=listings(d,'WHERE l.approved=0'),audits=[dict(r) for r in d.execute('SELECT a.*,u.name actor FROM audits a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100')])
@app.post('/api/admin/shops/<sid>')
@auth('Admin')
def audit_shop(sid):
    b=request.get_json();status=b.get('status');note=str(b.get('note','')).strip()
    if status not in ('Verified','Warning','Revoked','Pending') or not 10<=len(note)<=1000:return error('Choose a status and provide a 10â€“1000 character audit explanation.')
    with connect() as d:
        if not d.execute('SELECT id FROM shops WHERE id=?',(sid,)).fetchone():return error('Unknown store.',404)
        d.execute('UPDATE shops SET status=?,reason=?,updated_at=? WHERE id=?',(status,note,now(),sid))
        d.execute('INSERT INTO audits(actor_id,shop_id,action,note,created_at) VALUES(?,?,?,?,?)',(g.user['id'],sid,status,note,now()))
    return jsonify(message='Verification record updated.')
@app.post('/api/admin/listings/<int:lid>')
@auth('Admin')
def approve(lid):
    with connect() as d:
        l=d.execute('SELECT * FROM listings WHERE id=?',(lid,)).fetchone()
        if not l:return error('Unknown listing.',404)
        d.execute('UPDATE listings SET approved=? WHERE id=?',(1 if request.get_json().get('approved') else 0,lid))
        d.execute('INSERT INTO audits(actor_id,shop_id,action,note,created_at) VALUES(?,?,?,?,?)',(g.user['id'],l['shop_id'],'Listing reviewed',f'Listing {lid}: approved={bool(request.get_json().get("approved"))}',now()))
    return jsonify(message='Listing review saved.')
from market_routes import register as register_marketplace
register_marketplace(app,auth,error)
from assistant import register as register_assistant
register_assistant(app,auth,error)
from google_login import register as register_google
register_google(app,error)

@app.get('/',defaults={'path':''})
@app.get('/<path:path>')
def serve_app(path):
    if path.startswith('api/'):return error('Unknown API route.',404)
    if path and (ROOT/'dist'/path).is_file():return send_from_directory(ROOT/'dist',path)
    return send_from_directory(ROOT/'dist','index.html')
def create_app():
    seed()
    return app

from werkzeug.serving import WSGIRequestHandler
class PrivateRequestHandler(WSGIRequestHandler):
    def log_request(self, code='-', size='-'):
        if '?' in self.path:
            self.requestline=self.command+' '+self.path.split('?',1)[0]+'?[redacted] '+self.request_version
        super().log_request(code,size)

if __name__=='__main__':
    seed();app.run(host='127.0.0.1',port=int(os.environ.get('PORT',8000)),debug=False,request_handler=PrivateRequestHandler)


