"""Marketplace API boundaries: validate on server; scope complaints by authenticated owner."""
import json,secrets,base64,sqlite3
from flask import request,jsonify,g,Response
from db import connect,now
import marketplace as m

def register(app,auth,error):
 @app.get('/api/grades')
 def grades():return jsonify(grades=m.GRADES,checklist=m.CHECKS)
 @app.get('/api/products')
 @auth()
 def browse():
  with connect() as d:
   rows=m.products(d)
   if request.args.get('available','1')=='1':rows=[p for p in rows if p['recommended']]
   q=request.args.get('q','').casefold();kind=request.args.get('kind');inspection=request.args.get('inspection');shop=request.args.get('shop')
   rows=[p for p in rows if q in (p['title']+' '+p['model']+' '+p['shop_name']).casefold() and (not kind or p['kind']==kind) and (not inspection or p['inspection_status']==inspection) and (not shop or p['shop_id']==shop)]
   try:
    budget=int(request.args.get('budget','100000000'));rows=[p for p in rows if p['price']<=budget]
   except ValueError:return error('Budget must be a whole PKR amount.')
   return jsonify(products=rows,as_of=now())
 @app.get('/api/products/<pid>')
 @auth()
 def detail(pid):
  with connect() as d:
   p=m.product(d,pid)
   if not p:return error('This product is unavailable or awaiting publication.',404)
   p['location']=m.location(d,p['shop_id']);p['events']=[dict(r) for r in d.execute('SELECT action,note,created_at FROM product_events WHERE product_id=? ORDER BY id DESC',(pid,))]
   return jsonify(product=p)
 @app.get('/api/products/<pid>/qr')
 @auth()
 def item_qr(pid):
  with connect() as d:
   p=m.product(d,pid)
   if not p:return error('Unknown product.',404)
   return jsonify(payload='trustmart-item:'+pid,product_id=pid,revision=p['revision'])
 @app.get('/api/locations/<sid>')
 @auth()
 def location(sid):
  with connect() as d:
   loc=m.location(d,sid)
   if not loc:return error('Location has not been supplied. Ask the shop for its exact floor and unit.',404)
   saved=bool(d.execute('SELECT 1 FROM saved_shops WHERE user_id=? AND shop_id=?',(g.user['id'],sid)).fetchone())
   return jsonify(location=loc,saved=saved)
 @app.get('/api/saved-shops')
 @auth()
 def saved_shops():
  with connect() as d:return jsonify(shops=[dict(r) for r in d.execute('SELECT s.id,s.name,s.market,s.status,l.floor,l.unit FROM saved_shops x JOIN shops s ON s.id=x.shop_id LEFT JOIN shop_locations l ON l.shop_id=s.id WHERE x.user_id=? ORDER BY x.created_at DESC',(g.user['id'],))])
 @app.post('/api/saved-shops/<sid>')
 @auth()
 def save_shop(sid):
  with connect() as d:
   if not d.execute('SELECT id FROM shops WHERE id=?',(sid,)).fetchone():return error('Unknown shop.',404)
   if request.get_json().get('saved'):d.execute('INSERT OR IGNORE INTO saved_shops VALUES(?,?,?)',(g.user['id'],sid,now()))
   else:d.execute('DELETE FROM saved_shops WHERE user_id=? AND shop_id=?',(g.user['id'],sid))
   return jsonify(message='Saved places updated.')
 @app.get('/api/supplier/products')
 @auth('Supplier')
 def supplier_products():
  with connect() as d:
   shop=d.execute('SELECT id,status FROM shops WHERE user_id=?',(g.user['id'],)).fetchone()
   return jsonify(products=[p for p in m.products(d,True) if p['shop_id']==shop['id']],shop=dict(shop),location=m.location(d,shop['id']))
 @app.post('/api/supplier/products')
 @app.post('/api/supplier/products/<pid>')
 @auth('Supplier')
 def submit_product(pid=None):
  b=request.get_json()
  try:values=m.validate_product(b)
  except (ValueError,TypeError) as e:return error(str(e))
  with connect() as d:
   shop=d.execute('SELECT id,status FROM shops WHERE user_id=?',(g.user['id'],)).fetchone()
   if shop['status'] not in ('Verified','Warning'):return error('Shop approval is required before submitting products.',403)
   if pid:
    old=m.product(d,pid,True)
    if not old or old['shop_id']!=shop['id']:return error('You cannot edit this product.',403)
    if b.get('revision')!=old['revision']:return error('This listing changed. Reload before editing.',409)
    values.update(revision=old['revision']+1,publication='Pending',updated_at=now())
    d.execute('UPDATE products SET '+','.join(k+'=?' for k in values)+' WHERE id=?',tuple(values.values())+(pid,))
   else:
    kind=b.get('kind','Device')
    if kind not in ('Device','Component'):return error('Invalid product type.')
    pid='TM-'+secrets.token_hex(4).upper();values.update(id=pid,shop_id=shop['id'],kind=kind,component_id=None,photos=json.dumps(['/media/device-front.svg' if kind=='Device' else '/media/component.svg']),unit_ref=pid+'-DEMO',publication='Pending',revision=1,created_at=now(),updated_at=now())
    d.execute('INSERT INTO products('+','.join(values)+') VALUES('+','.join('?' for _ in values)+')',tuple(values.values()))
   m.snapshot(d,pid,g.user['id'])
   d.execute('INSERT INTO product_events(product_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',(pid,g.user['id'],'Seller submission','New revision awaits publication and a separate item inspection.',now()))
   return jsonify(message='Saved for review. Prior inspection does not certify this new revision.',product_id=pid)
 @app.post('/api/supplier/location')
 @auth('Supplier')
 def supplier_location():
  b=request.get_json()
  try:
   floor=int(b.get('floor',0));building=str(b['building']).strip();unit=str(b['unit']).strip();entrance=str(b['entrance']).strip();landmark=str(b['landmark']).strip();steps=b['steps']
   if not -2<=floor<=20 or not all(1<=len(x)<=200 for x in [building,unit,entrance,landmark]) or not isinstance(steps,list) or not 1<=len(steps)<=8 or not all(isinstance(s,str) and 1<=len(s)<=300 for s in steps):raise ValueError()
  except (ValueError,KeyError,TypeError):return error('Supply building, floor, unit, entrance, landmark and 1–8 short direction steps.')
  with connect() as d:
   shop=d.execute('SELECT id FROM shops WHERE user_id=?',(g.user['id'],)).fetchone()
   # All placements remain illustrative in this synthetic demo; no surveyed coordinates are claimed.
   d.execute('INSERT INTO shop_locations VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(shop_id) DO UPDATE SET building=excluded.building,floor=excluded.floor,unit=excluded.unit,entrance=excluded.entrance,landmark=excluded.landmark,steps=excluded.steps,reviewed=0,updated_at=excluded.updated_at',(shop['id'],building,floor,unit,entrance,landmark,json.dumps(steps),720,200,1,0,now()))
   return jsonify(message='Directions saved as seller-declared, awaiting admin review.')
 @app.get('/api/admin/marketplace')
 @auth('Admin')
 def admin_marketplace():
  with connect() as d:return jsonify(products=m.products(d,True),locations=[dict(r) for r in d.execute('SELECT l.*,s.name shop_name FROM shop_locations l JOIN shops s ON s.id=l.shop_id WHERE reviewed=0')])
 @app.post('/api/admin/products/<pid>/review')
 @auth('Admin')
 def review_product(pid):
  b=request.get_json();action=b.get('action');note=str(b.get('note','')).strip()
  if action not in ('publish','pause') or not 10<=len(note)<=1500:return error('Choose publish/pause and supply a review reason.')
  with connect() as d:
   p=m.product(d,pid,True)
   if not p:return error('Unknown item.',404)
   if b.get('revision')!=p['revision']:return error('A newer revision exists. Reload before reviewing.',409)
   d.execute('UPDATE products SET publication=?,updated_at=? WHERE id=?',('Published' if action=='publish' else 'Paused',now(),pid))
   d.execute('INSERT INTO product_events(product_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',(pid,g.user['id'],'Published' if action=='publish' else 'Paused',note,now()))
   return jsonify(message='Publication decision recorded. Item inspection is a separate assessment.')
 @app.post('/api/admin/products/<pid>/inspect')
 @auth('Admin')
 def inspect_product(pid):
  b=request.get_json();checks=b.get('checklist',{});note=str(b.get('notes','')).strip();outcome=b.get('outcome');repairs=str(b.get('repairs','')).strip();opening=str(b.get('opening_history','')).strip()
  try:bh=None if b.get('battery_health') in ('',None) else int(b['battery_health'])
  except (ValueError,TypeError):return error('Invalid battery reading.')
  if outcome not in ('Inspected','Needs review') or set(checks)!=set(m.CHECKS) or any(x not in ('Pass','Fail','Not tested') for x in checks.values()) or not 10<=len(note)<=1500 or not 1<=len(repairs)<=1500 or not 1<=len(opening)<=1500 or (bh is not None and not 0<=bh<=100):return error('Complete the checklist, inspection notes, repair findings and opening-history uncertainty.')
  if outcome=='Inspected' and (any(x=='Fail' for x in checks.values()) or not any(x=='Pass' for x in checks.values())):return error('A passing inspection needs at least one passed check and no failed checks. Use Needs review for failures.')
  with connect() as d:
   p=m.product(d,pid,True)
   if not p:return error('Unknown item.',404)
   if b.get('revision')!=p['revision']:return error('A newer revision exists. Reload before inspecting.',409)
   d.execute('INSERT INTO inspections(product_id,revision,inspector_id,outcome,checklist,notes,battery_health,repairs,opening_history,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',(pid,p['revision'],g.user['id'],outcome,json.dumps(checks),note,bh,repairs,opening,now()))
   d.execute('INSERT INTO product_events(product_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',(pid,g.user['id'],'Item inspection',outcome+': '+note,now()))
   return jsonify(message='Inspection saved for this exact listing revision. Untested checks remain unknown.')
 @app.post('/api/admin/locations/<sid>')
 @auth('Admin')
 def approve_location(sid):
  with connect() as d:
   if not d.execute('SELECT 1 FROM shop_locations WHERE shop_id=?',(sid,)).fetchone():return error('Unknown location.',404)
   d.execute('UPDATE shop_locations SET reviewed=1,updated_at=? WHERE shop_id=?',(now(),sid))
   d.execute('INSERT INTO audits(actor_id,shop_id,action,note,created_at) VALUES(?,?,?,?,?)',(g.user['id'],sid,'Directions reviewed','Fictional demo location reviewed; not a surveyed floor plan.',now()))
   return jsonify(message='Sample directions reviewed.')
 @app.post('/api/complaints')
 @auth('Consumer')
 def create_complaint():
  b=request.get_json();reason=b.get('reason');description=str(b.get('description','')).strip();pid=b.get('product_id')
  if reason not in ('Item mismatch','Undisclosed repair','Suspected counterfeit','Warranty dispute','Shop conduct','Other') or not 20<=len(description)<=3000 or b.get('confirmed') is not True:return error('Choose a reason, describe the issue (20–3000 characters), and confirm submission.')
  image=None
  if b.get('evidence'):
   try:
    image=base64.b64decode(b['evidence'],validate=True)
    if len(image)>1500000 or not image.startswith(b'\xff\xd8\xff') or not image.endswith(b'\xff\xd9'):raise ValueError()
   except (ValueError,TypeError):return error('Evidence must be a JPEG image below 1.5 MB.')
  with connect() as d:
   p=m.product(d,pid)
   if not p:return error('Unknown product.',404)
   if b.get('revision')!=p['revision']:return error('This product has changed. Reload and review it before submitting.',409)
   if d.execute("SELECT count(*) FROM complaints WHERE user_id=? AND substr(created_at,1,10)=?",(g.user['id'],now()[:10])).fetchone()[0]>=5:return error('Demo limit reached: five reports per account per day.',429)
   cid='CASE-'+secrets.token_hex(4).upper()
   d.execute('INSERT INTO complaints(id,user_id,product_id,reason,description,snapshot,status,created_at,updated_at) VALUES(?,?,?,?,?,?,\'Open\',?,?)',(cid,g.user['id'],pid,reason,description,json.dumps(p),now(),now()))
   d.execute('INSERT INTO complaint_events(complaint_id,actor_id,actor_role,note,created_at) VALUES(?,?,?,?,?)',(cid,g.user['id'],g.user['role'],'Report submitted. Listing revision and inspection were snapshotted.',now()))
   if image:d.execute('INSERT INTO complaint_evidence VALUES(?,?,?)',(cid,image,'image/jpeg'))
   return jsonify(message='Report submitted. Your case is saved for review; no refund outcome is promised.',complaint_id=cid),201
 @app.get('/api/complaints')
 @auth()
 def complaints():
  with connect() as d:
   rows=[m.complaint(d,r['id'],g.user) for r in d.execute('SELECT id FROM complaints ORDER BY created_at DESC')]
   return jsonify(complaints=[r for r in rows if r])
 @app.get('/api/complaints/<cid>')
 @auth()
 def get_complaint(cid):
  with connect() as d:
   c=m.complaint(d,cid,g.user)
   return jsonify(complaint=c) if c else error('Case not found.',404)
 @app.get('/api/complaints/<cid>/evidence')
 @auth()
 def evidence(cid):
  with connect() as d:
   if not m.complaint(d,cid,g.user):return error('Case not found.',404)
   r=d.execute('SELECT * FROM complaint_evidence WHERE complaint_id=?',(cid,)).fetchone()
   return Response(r['image'],mimetype=r['mime']) if r else error('No evidence image supplied.',404)
 @app.post('/api/complaints/<cid>/respond')
 @auth('Supplier')
 def respond(cid):
  note=str(request.get_json().get('note','')).strip()
  if not 10<=len(note)<=2000:return error('Provide a response between 10 and 2000 characters.')
  with connect() as d:
   c=m.complaint(d,cid,g.user)
   if not c:return error('Case not found.',404)
   if c['status'] in ('Resolved','Dismissed'):return error('This case is closed.',409)
   d.execute('INSERT INTO complaint_events(complaint_id,actor_id,actor_role,note,created_at) VALUES(?,?,?,?,?)',(cid,g.user['id'],'Supplier',note,now()))
   d.execute('UPDATE complaints SET status=\'Reviewing\',updated_at=? WHERE id=?',(now(),cid))
   return jsonify(message='Supplier response recorded for administrator review.')
 @app.post('/api/admin/complaints/<cid>')
 @auth('Admin')
 def resolve_complaint(cid):
  b=request.get_json();status=b.get('status');note=str(b.get('note','')).strip();action=b.get('action','none')
  if status not in ('Reviewing','Awaiting supplier','Resolved','Dismissed') or action not in ('none','pause_product','warn_shop','revoke_shop') or not 10<=len(note)<=2000:return error('Choose a case status, action and a detailed explanation.')
  with connect() as d:
   c=m.complaint(d,cid,g.user)
   if not c:return error('Case not found.',404)
   if c['status'] in ('Resolved','Dismissed'):return error('This case is closed; its audit record is preserved.',409)
   d.execute('UPDATE complaints SET status=?,resolution=?,updated_at=? WHERE id=?',(status,note,now(),cid))
   d.execute('INSERT INTO complaint_events(complaint_id,actor_id,actor_role,note,created_at) VALUES(?,?,?,?,?)',(cid,g.user['id'],'Admin',status+' / '+action+': '+note,now()))
   if action=='pause_product':
    d.execute('UPDATE products SET publication=\'Paused\',updated_at=? WHERE id=?',(now(),c['product_id']))
    d.execute('INSERT INTO product_events(product_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',(c['product_id'],g.user['id'],'Paused following complaint',note,now()))
   if action in ('warn_shop','revoke_shop'):
    state='Warning' if action=='warn_shop' else 'Revoked'
    d.execute('UPDATE shops SET status=?,reason=?,updated_at=? WHERE id=?',(state,note,now(),c['shop_id']))
    d.execute('INSERT INTO audits(actor_id,shop_id,action,note,created_at) VALUES(?,?,?,?,?)',(g.user['id'],c['shop_id'],state,note,now()))
   return jsonify(message='Case decision and any enforcement action recorded.')
 @app.post('/api/supplier/products/<pid>/photos')
 @auth('Supplier')
 def upload_photo(pid):
  b=request.get_json()
  try:
   image=base64.b64decode(b.get('image',''),validate=True)
   if not image.startswith(b'\xff\xd8\xff') or not image.endswith(b'\xff\xd9') or len(image)>1500000:raise ValueError()
  except (ValueError,TypeError):return error('Use a JPEG photo below 1.5 MB.')
  with connect() as d:
   p=m.product(d,pid,True);shop=d.execute('SELECT id,status FROM shops WHERE user_id=?',(g.user['id'],)).fetchone()
   if not p or p['shop_id']!=shop['id']:return error('You cannot edit this item.',403)
   if shop['status'] not in ('Verified','Warning'):return error('Shop approval is required.',403)
   if b.get('revision')!=p['revision']:return error('Reload this listing before uploading.',409)
   if d.execute('SELECT count(*) FROM product_media WHERE product_id=?',(pid,)).fetchone()[0]>=6:return error('Maximum six item photos.')
   mid=secrets.token_urlsafe(18);d.execute('INSERT INTO product_media VALUES(?,?,?,?)',(mid,pid,image,now()))
   d.execute('UPDATE products SET revision=revision+1,publication=\'Pending\',updated_at=? WHERE id=?',(now(),pid));m.snapshot(d,pid,g.user['id'])
   d.execute('INSERT INTO product_events(product_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',(pid,g.user['id'],'Seller photo added','Evidence change requires a fresh listing and item review.',now()))
   return jsonify(message='Photo saved. New revision awaits review.')
 @app.get('/api/product-media/<mid>')
 @auth()
 def product_media(mid):
  with connect() as d:
   r=d.execute('SELECT * FROM product_media WHERE id=?',(mid,)).fetchone()
   if not r:return error('Image not found.',404)
   p=m.product(d,r['product_id'],True)
   if p['publication']=='Pending' and g.user['role']!='Admin' and not d.execute('SELECT id FROM shops WHERE id=? AND user_id=?',(p['shop_id'],g.user['id'])).fetchone():return error('Image not found.',404)
   return Response(r['image'],mimetype='image/jpeg')
