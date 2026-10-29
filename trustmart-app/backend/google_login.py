"""Google OIDC consumer login with state, nonce, PKCE and verified ID tokens."""
import os,json,secrets,hashlib,base64,urllib.request,urllib.error,sqlite3
from datetime import datetime,timezone,timedelta
from urllib.parse import urlencode,urlparse
from flask import request,jsonify,redirect
from db import connect,now
from assistant import load_settings

def configuration():
 load_settings();base=os.environ.get('TRUSTMART_PUBLIC_URL','http://localhost:8000').rstrip('/')
 return {'enabled':bool(os.environ.get('GOOGLE_CLIENT_ID') and os.environ.get('GOOGLE_CLIENT_SECRET')),'base':base,'redirect_uri':base+'/api/auth/google/callback'}

def register(app,error):
 @app.get('/api/auth/providers')
 def providers():
  c=configuration();return jsonify(google=c['enabled'],google_note='Continue with Google creates a Consumer account. Supplier/admin accounts keep password + authenticator access.' if c['enabled'] else 'Google sign-in requires OAuth setup. Demo role accounts remain available.',email_verification='No email codes are sent in this demo.')
 @app.get('/api/auth/google/start')
 def start_google():
  c=configuration()
  if not c['enabled']:return error('Google sign-in is not configured. Use a demo account or email/password.',503)
  link_hash=None
  if request.args.get('link')=='1':
   link_hash=hashlib.sha256(request.cookies.get('trustmart_session','').encode()).hexdigest()
   with connect() as d:
    owner=d.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?',(link_hash,now())).fetchone()
   if not owner or owner['role']!='Consumer' or owner['email'].endswith('@trustmart.demo'):return error('Sign in to your personal consumer account before connecting Google.',403)
  u=urlparse(c['base'])
  if u.scheme not in ('http','https') or (u.scheme=='http' and u.hostname not in ('localhost','127.0.0.1')):return error('Google sign-in requires a valid HTTPS public URL or localhost.',503)
  if request.host!=u.netloc:return redirect(c['base']+'/api/auth/google/start'+('?link=1' if link_hash else ''))
  state=secrets.token_urlsafe(32);nonce=secrets.token_urlsafe(32);verifier=secrets.token_urlsafe(48);cookie=secrets.token_urlsafe(32)
  challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
  with connect() as d:
   d.execute('DELETE FROM oauth_states WHERE expires_at<=?',(now(),))
   d.execute('INSERT INTO oauth_states VALUES(?,?,?,?,?,?)',(hashlib.sha256(state.encode()).hexdigest(),hashlib.sha256(cookie.encode()).hexdigest(),nonce,verifier,(datetime.now(timezone.utc)+timedelta(minutes=10)).isoformat(),c['redirect_uri']))
   if link_hash:d.execute('INSERT INTO oauth_links VALUES(?,?)',(hashlib.sha256(state.encode()).hexdigest(),link_hash))
  url='https://accounts.google.com/o/oauth2/v2/auth?'+urlencode({'client_id':os.environ['GOOGLE_CLIENT_ID'],'redirect_uri':c['redirect_uri'],'response_type':'code','scope':'openid email profile','state':state,'nonce':nonce,'code_challenge':challenge,'code_challenge_method':'S256','prompt':'select_account'})
  r=redirect(url);r.set_cookie('trustmart_google_state',cookie,httponly=True,secure=u.scheme=='https',samesite='Lax',max_age=600);return r
 @app.get('/api/auth/google/callback')
 def finish_google():
  c=configuration();fail=lambda code:redirect(c['base']+'/?auth_error='+code+'#home')
  if not c['enabled']:return fail('google_not_configured')
  state=request.args.get('state','');cookie=request.cookies.get('trustmart_google_state','');code=request.args.get('code','')
  with connect() as d:
   row=d.execute('SELECT * FROM oauth_states WHERE state_hash=? AND expires_at>?',(hashlib.sha256(state.encode()).hexdigest(),now())).fetchone()
   if not row or not secrets.compare_digest(row['cookie_hash'],hashlib.sha256(cookie.encode()).hexdigest()):return fail('google_state_invalid')
   link=d.execute('SELECT u.id,u.email,u.role FROM oauth_links l JOIN sessions s ON s.token=l.session_hash JOIN users u ON u.id=s.user_id WHERE l.state_hash=? AND s.expires_at>?',(row['state_hash'],now())).fetchone()
   linking=d.execute('SELECT 1 FROM oauth_links WHERE state_hash=?',(row['state_hash'],)).fetchone() is not None
   d.execute('DELETE FROM oauth_states WHERE state_hash=?',(row['state_hash'],))
  if linking and not link:return fail('google_link_expired')
  if request.args.get('error') or not code:return fail('google_cancelled')
  stage='token exchange'
  try:
   body=urlencode({'code':code,'client_id':os.environ['GOOGLE_CLIENT_ID'],'client_secret':os.environ['GOOGLE_CLIENT_SECRET'],'redirect_uri':row['redirect_uri'],'grant_type':'authorization_code','code_verifier':row['verifier']}).encode()
   req=urllib.request.Request('https://oauth2.googleapis.com/token',data=body,headers={'Content-Type':'application/x-www-form-urlencoded'},method='POST')
   with urllib.request.urlopen(req,timeout=15) as response:tokens=json.loads(response.read(64000))
   from google.oauth2 import id_token
   from google.auth.transport.requests import Request
   stage='identity verification'
   identity=id_token.verify_oauth2_token(tokens['id_token'],Request(),os.environ['GOOGLE_CLIENT_ID'])
   if identity.get('iss') not in ('https://accounts.google.com','accounts.google.com') or identity.get('email_verified') is not True or not secrets.compare_digest(identity.get('nonce',''),row['nonce']) or not identity.get('sub'):return fail('google_identity_invalid')
   stage='account creation'
   email=identity['email'].strip().lower()
   with connect() as d:
    linked=d.execute('SELECT u.* FROM google_identities i JOIN users u ON u.id=i.user_id WHERE i.subject=?',(identity['sub'],)).fetchone()
    if linking and (link['role']!='Consumer' or link['email']!=email or (linked and linked['id']!=link['id'])):return fail('google_link_account_mismatch')
    if linked:
     if linked['role']!='Consumer':return fail('privileged_login_required')
     uid=linked['id']
    else:
     # No automatic email-based account linking; existing privileged/password accounts cannot be bypassed.
     if linking:
      uid=link['id']
     else:
      if d.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone():return fail('existing_account_use_password')
      import bcrypt
      uid=d.execute('INSERT INTO users(email,name,password,role,created_at) VALUES(?,?,?,\'Consumer\',?)',(email,str(identity.get('name','Google consumer'))[:80],bcrypt.hashpw(secrets.token_urlsafe(40).encode(),bcrypt.gensalt()),now())).lastrowid
     d.execute('INSERT INTO google_identities VALUES(?,?)',(identity['sub'],uid))
    token=secrets.token_urlsafe(32)
    d.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),uid,(datetime.now(timezone.utc)+timedelta(hours=8)).isoformat()))
   r=redirect(c['base']+'/#products');r.set_cookie('trustmart_session',token,httponly=True,secure=urlparse(c['base']).scheme=='https',samesite='Strict',max_age=28800);r.delete_cookie('trustmart_google_state');return r
  except Exception as exc:
   app.logger.warning('Google sign-in failed at %s (%s)',stage,type(exc).__name__)
   # Never return provider responses, access tokens, authorization codes or secrets to the UI/logs.
   return fail('google_unavailable')
