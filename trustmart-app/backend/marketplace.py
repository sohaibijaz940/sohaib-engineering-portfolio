"""Versioned transparency records. Shop approval never certifies an individual item."""
import json,secrets,base64,re
from urllib.parse import urlencode
from db import connect,now

GRADES=[
 {'name':'Aftermarket A','plain':'Third-party replacement Â· standard functional grade','meaning':'A supplier-declared third-party part that meets the listed basic function/fit requirements without declared material limitations. Not a manufacturer-original claim.','criteria':['Compatible fit declared','Core functions declared working','Material limitations must be disclosed'],'caution':'A is a TrustMart demo classification, not a universal market standard. Check the individual inspection and warranty.'},
 {'name':'Aftermarket B','plain':'Third-party replacement Â· disclosed limitations','meaning':'A supplier-declared working third-party part with stated cosmetic or performance limitations. Read the exact limitations before comparing prices.','criteria':['Compatibility declared','Known limitations documented','Warranty shown separately'],'caution':'B does not mean counterfeit. Undisclosed defects are not acceptable in either grade.'},
 {'name':'Refurbished','plain':'Previously used and repaired or reconditioned','meaning':'A condition description, not an origin or performance guarantee. The listing must say what work is known and what history is unknown.','criteria':['Known repairs disclosed','Origin stated separately','Tests and warranty shown separately'],'caution':'Refurbished does not mean manufacturer-refurbished unless independent evidence establishes that.'}
]
CHECKS=['Display','Touch','Face ID / biometrics','Front camera','Rear camera','Charging','Battery','Speakers','Microphone','Wi-Fi / Bluetooth','Buttons','Water / corrosion indicators']

def migrate():
 with connect() as d:
  if 'business_phone' not in {r['name'] for r in d.execute('PRAGMA table_info(shops)')}:
   d.execute("ALTER TABLE shops ADD COLUMN business_phone TEXT NOT NULL DEFAULT ''")
   for r in d.execute('SELECT id FROM shops').fetchall():
    if r['id'] in ['Shop'+str(i) for i in range(804,814)]:d.execute('UPDATE shops SET business_phone=? WHERE id=?',('+92 3XX XXX '+r['id'][-3:].zfill(4),r['id']))
  d.executescript('''
  CREATE TABLE IF NOT EXISTS oauth_states(state_hash TEXT PRIMARY KEY,cookie_hash TEXT NOT NULL,nonce TEXT NOT NULL,verifier TEXT NOT NULL,expires_at TEXT NOT NULL,redirect_uri TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS oauth_links(state_hash TEXT PRIMARY KEY REFERENCES oauth_states(state_hash) ON DELETE CASCADE,session_hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS google_identities(subject TEXT PRIMARY KEY,user_id INTEGER UNIQUE NOT NULL REFERENCES users(id));
  CREATE TABLE IF NOT EXISTS product_media(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),image BLOB NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,shop_id TEXT NOT NULL REFERENCES shops(id),kind TEXT NOT NULL CHECK(kind IN ('Device','Component')),component_id INTEGER REFERENCES components(id),title TEXT NOT NULL,model TEXT NOT NULL,storage TEXT NOT NULL,color TEXT NOT NULL,condition TEXT NOT NULL CHECK(condition IN ('New','Used','Refurbished')),origin TEXT NOT NULL CHECK(origin IN ('Manufacturer-original declared','Third-party','Unconfirmed')),grade TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),stock INTEGER NOT NULL CHECK(stock>=0),warranty_days INTEGER NOT NULL,warranty_terms TEXT NOT NULL,return_terms TEXT NOT NULL,description TEXT NOT NULL,defects TEXT NOT NULL,repairs TEXT NOT NULL,opening_history TEXT NOT NULL,battery_health INTEGER,photos TEXT NOT NULL,unit_ref TEXT NOT NULL,publication TEXT NOT NULL CHECK(publication IN ('Pending','Published','Paused')),revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS product_revisions(id INTEGER PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),revision INTEGER NOT NULL,snapshot TEXT NOT NULL,actor_id INTEGER REFERENCES users(id),created_at TEXT NOT NULL,UNIQUE(product_id,revision));
  CREATE TABLE IF NOT EXISTS inspections(id INTEGER PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),revision INTEGER NOT NULL,inspector_id INTEGER NOT NULL REFERENCES users(id),outcome TEXT NOT NULL CHECK(outcome IN ('Inspected','Needs review')),checklist TEXT NOT NULL,notes TEXT NOT NULL,battery_health INTEGER,repairs TEXT NOT NULL,opening_history TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS product_events(id INTEGER PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),actor_id INTEGER REFERENCES users(id),action TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS complaints(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),product_id TEXT NOT NULL REFERENCES products(id),reason TEXT NOT NULL,description TEXT NOT NULL,snapshot TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('Open','Reviewing','Awaiting supplier','Resolved','Dismissed')),resolution TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS complaint_events(id INTEGER PRIMARY KEY,complaint_id TEXT NOT NULL REFERENCES complaints(id),actor_id INTEGER NOT NULL REFERENCES users(id),actor_role TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS complaint_evidence(complaint_id TEXT PRIMARY KEY REFERENCES complaints(id),image BLOB NOT NULL,mime TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS shop_locations(shop_id TEXT PRIMARY KEY REFERENCES shops(id),building TEXT NOT NULL,floor INTEGER NOT NULL,unit TEXT NOT NULL,entrance TEXT NOT NULL,landmark TEXT NOT NULL,steps TEXT NOT NULL,x INTEGER NOT NULL,y INTEGER NOT NULL,illustrative INTEGER NOT NULL DEFAULT 1,reviewed INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS saved_shops(user_id INTEGER REFERENCES users(id),shop_id TEXT REFERENCES shops(id),created_at TEXT NOT NULL,PRIMARY KEY(user_id,shop_id));
  CREATE TABLE IF NOT EXISTS assistant_usage(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),ip_hash TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_product_shop ON products(shop_id,publication);
  CREATE INDEX IF NOT EXISTS idx_complaint_owner ON complaints(user_id,created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_usage ON assistant_usage(created_at,user_id);
  ''')
  if d.execute('SELECT count(*) FROM products').fetchone()[0] or not d.execute('SELECT id FROM shops LIMIT 1').fetchone():return
  shops=d.execute('SELECT * FROM shops ORDER BY id').fetchall()
  for i,s in enumerate(shops):
   floor=[0,1,-1,2,3][i%5];unit=('B' if floor<0 else str(floor))+'-'+str(12+i)
   d.execute('INSERT INTO shop_locations VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',(s['id'],s['market'],floor,unit,'Main entrance (illustrative)','Lift lobby and staircase (illustrative)',json.dumps(['Enter the main entrance shown in the sample photo.',f'Take the lift or stairs to {"Basement" if floor<0 else "Ground floor" if floor==0 else "Floor "+str(floor)}.',f'From the lift lobby, follow the highlighted sample corridor to Unit {unit}.','Match the shop name and Shop ID before entering.']),[720,270,520][i%3],200+(i%3)*130,1,1,now()))
  devices=[('TM-1301','Shop804','iPhone 13','128 GB','Midnight','Used',78000,'Light marks on frame; small scratch near charging port.','Seller declares a display replacement in 2025; earlier repair history unavailable.',87,'Inspected'),('TM-1302','Shop806','iPhone 13','128 GB','Blue','Used',74500,'Visible wear on corners.','Seller reports no repairs; independent repair history unavailable.',82,'Pending'),('TM-1303','Shop807','iPhone 13','256 GB','Starlight','Refurbished',81500,'Replacement rear housing disclosed.','Seller declares battery and housing replacement; prior owner history unknown.',None,'Needs review'),('TM-1201','Shop808','iPhone 12','128 GB','Black','Used',62500,'Small scratches on screen and rear glass.','Opening and repair history unknown.',84,'Inspected'),('TM-A521','Shop809','Samsung A52','128 GB','Awesome Black','Used',48500,'Minor frame marks; screen protector scuffed.','No repair documentation supplied. Opening history unknown.',None,'Pending'),('TM-1304','Shop812','iPhone 13','128 GB','Red','Used',68000,'Sample listing associated with a revoked supplier.','Seller declarations require review.',79,'Needs review')]
  admin=d.execute("SELECT id FROM users WHERE role='Admin' LIMIT 1").fetchone()[0]
  for pid,sid,model,storage,color,condition,price,defects,repairs,battery,state in devices:
   d.execute('''INSERT INTO products(id,shop_id,kind,component_id,title,model,storage,color,condition,origin,grade,price,stock,warranty_days,warranty_terms,return_terms,description,defects,repairs,opening_history,battery_health,photos,unit_ref,publication,revision,created_at,updated_at) VALUES(?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)''',(pid,sid,'Device',model+' Â· '+storage,model,storage,color,condition,'Unconfirmed','Not applicable',price,1,30,'Sample 30-day shop warranty for the listed functional checks. Physical/liquid damage excluded. No platform reimbursement promise.','Sample: report an undisclosed mismatch within 48 hours for review; no automatic refund is promised.','FICTIONAL individually listed used phone for the TrustMart recruiter demonstration.',defects,repairs,'Unknown before documented inspection. Never-opened status is not established.',battery,json.dumps(['/media/device-front.svg','/media/device-back.svg','/media/device-detail.svg']),pid[-4:]+'-DEMO','Published',now(),now()))
   snapshot(d,pid,admin)
   if state!='Pending':
    checks={k:('Not tested' if k in ['Water / corrosion indicators','Battery'] else 'Pass') for k in CHECKS}
    if state=='Needs review':checks['Display']='Fail'
    d.execute('INSERT INTO inspections(product_id,revision,inspector_id,outcome,checklist,notes,battery_health,repairs,opening_history,created_at) VALUES(?,1,?,?,?,?,?,?,?,?)',(pid,admin,state,json.dumps(checks),'Fictional inspection evidence for demonstration. Checks reflect this recorded date only.',battery,repairs,'Evidence establishes disclosed work only; earlier opening history remains unknown.',now()))
   d.execute('INSERT INTO product_events(product_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',(pid,admin,'Listing published','Fictional demo item created.',now()))
  d.execute('''INSERT INTO products(id,shop_id,kind,component_id,title,model,storage,color,condition,origin,grade,price,stock,warranty_days,warranty_terms,return_terms,description,defects,repairs,opening_history,battery_health,photos,unit_ref,publication,revision,created_at,updated_at) VALUES('TM-D130','Shop804','Component',1,'iPhone 13 third-party display','iPhone 13','Not applicable','Black','New','Third-party','Aftermarket A',18500,8,30,?,?,?,?,?,?,NULL,?,?,'Published',1,?,?)''',('Sample shop warranty: touch/display function, no accidental damage cover.','Sample mismatch review within 48 hours.','FICTIONAL third-party replacement display; not a manufacturer-original part.','No cosmetic limitation declared.','New replacement part; installation not included.','Not applicable to an uninstalled replacement part.',json.dumps(['/media/component.svg']), 'D130-DEMO',now(),now()))
  snapshot(d,'TM-D130',admin)

def snapshot(d,pid,actor):
 p=dict(d.execute('SELECT * FROM products WHERE id=?',(pid,)).fetchone())
 d.execute('INSERT INTO product_revisions(product_id,revision,snapshot,actor_id,created_at) VALUES(?,?,?,?,?)',(pid,p['revision'],json.dumps(p),actor,now()))

def product(d,pid,private=False):
 r=d.execute('SELECT p.*,s.name shop_name,s.status shop_status,s.market FROM products p JOIN shops s ON s.id=p.shop_id WHERE p.id=?',(pid,)).fetchone()
 if not r or (not private and r['publication']=='Pending'):return None
 p=dict(r);p['photos']=json.loads(p['photos']);p['fictional']=True
 p['photo_source']='Illustrations, not actual-item photographs'
 media=d.execute('SELECT id FROM product_media WHERE product_id=? ORDER BY created_at',(pid,)).fetchall()
 if media:
  p['photos']=['/api/product-media/'+r['id'] for r in media];p['photo_source']='Seller-uploaded photos; not independently authenticated'
 ins=d.execute('SELECT i.*,u.name inspector FROM inspections i JOIN users u ON u.id=i.inspector_id WHERE i.product_id=? ORDER BY i.id DESC LIMIT 1',(pid,)).fetchone()
 p['inspection']=dict(ins) if ins else None
 if ins:p['inspection']['checklist']=json.loads(ins['checklist'])
 p['inspection_status']='Pending' if not ins else 'Needs review' if ins['revision']!=p['revision'] else ins['outcome']
 p['recommended']=p['publication']=='Published' and p['shop_status']=='Verified' and p['stock']>0
 p['claim_labels']={'seller':'Seller declared','inspected':'TrustMart inspected (fictional demo)','unknown':'Unknown / not assessed'}
 return p

def products(d,private=False):
 return [product(d,r['id'],private) for r in d.execute('SELECT id FROM products '+('' if private else "WHERE publication!='Pending' ")+'ORDER BY created_at DESC,id')]

def location(d,sid):
 r=d.execute('SELECT l.*,s.name shop_name,s.market,s.hours,s.business_phone FROM shop_locations l JOIN shops s ON s.id=l.shop_id WHERE l.shop_id=?',(sid,)).fetchone()
 if not r:return None
 r=dict(r);r['steps']=json.loads(r['steps']);r['floor_label']='Basement' if r['floor']<0 else 'Ground floor' if r['floor']==0 else 'Floor '+str(r['floor'])
 r['google_url']='https://www.google.com/maps/dir/?'+urlencode({'api':'1','destination':r['building']+', Lahore, Pakistan'})
 r['photo']='/media/shopfront.svg';r['entrance_photo']='/media/entrance.svg';return r

def complaint(d,cid,user):
 r=d.execute('SELECT c.*,p.shop_id,p.title,s.name shop_name FROM complaints c JOIN products p ON p.id=c.product_id JOIN shops s ON s.id=p.shop_id WHERE c.id=?',(cid,)).fetchone()
 if not r:return None
 allowed=user['role']=='Admin' or r['user_id']==user['id'] or (user['role']=='Supplier' and d.execute('SELECT id FROM shops WHERE user_id=? AND id=?',(user['id'],r['shop_id'])).fetchone())
 if not allowed:return None
 c=dict(r);c['snapshot']=json.loads(c['snapshot']);c['events']=[dict(x) for x in d.execute('SELECT e.*,u.name actor FROM complaint_events e JOIN users u ON u.id=e.actor_id WHERE complaint_id=? ORDER BY e.id',(cid,))]
 c['has_evidence']=bool(d.execute('SELECT 1 FROM complaint_evidence WHERE complaint_id=?',(cid,)).fetchone());return c

def validate_product(b):
 fields=['title','model','storage','color','condition','origin','grade','warranty_terms','return_terms','description','defects','repairs','opening_history']
 values={k:str(b.get(k,'')).strip() for k in fields}
 if any(not 1<=len(v)<=1500 for v in values.values()):raise ValueError('Complete all disclosure fields (use Unknown where history is unavailable). Maximum 1500 characters each.')
 if values['condition'] not in ('New','Used','Refurbished') or values['origin'] not in ('Manufacturer-original declared','Third-party','Unconfirmed'):raise ValueError('Invalid origin or condition.')
 for k,lo,hi in [('price',100,100000000),('stock',0,10000),('warranty_days',0,365)]:
  raw=b.get(k);n=int(raw)
  if isinstance(raw,bool) or str(n)!=str(raw) or not lo<=n<=hi:raise ValueError('Invalid '+k)
  values[k]=n
 bh=b.get('battery_health');values['battery_health']=None if bh in ('',None) else int(bh)
 if values['battery_health'] is not None and not 0<=values['battery_health']<=100:raise ValueError('Battery health must be 0â€“100 or blank.')
 return values
