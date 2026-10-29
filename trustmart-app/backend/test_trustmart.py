import unittest,tempfile,sys,os
from pathlib import Path
from datetime import datetime,timezone,timedelta
sys.path.insert(0,str(Path(__file__).parent))
import db
from pricing import market_average
import server
import pyotp

class PricingTests(unittest.TestCase):
 def offer(self,p,**kw):
  return dict(price=p,status='Verified',approved=1,stock=3,updated_at=datetime.now(timezone.utc).isoformat(),**kw)
 def test_trimmed_mean(self):
  r=market_average([self.offer(p) for p in [100,200,300,400,10000]])
  self.assertEqual(r['average'],300);self.assertEqual(r['trimmed'],2);self.assertEqual(r['used'],3)
 def test_small_sample(self):
  r=market_average([self.offer(100),self.offer(300)])
  self.assertEqual(r['average'],200);self.assertEqual(r['confidence'],'Low confidence');self.assertEqual(r['trimmed'],0)
 def test_exclusions(self):
  rows=[self.offer(100) for _ in range(7)]
  rows[0]['status']='Revoked';rows[1]['status']='Warning';rows[2]['status']='Pending';rows[3]['approved']=0;rows[4]['stock']=0;rows[5]['updated_at']=(datetime.now(timezone.utc)-timedelta(days=8)).isoformat();rows[6]['updated_at']=(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()
  self.assertIsNone(market_average(rows)['average'])
 def test_empty(self):self.assertEqual(market_average([])['eligible'],0)
 def test_boundary_freshness(self):
  t=datetime.now(timezone.utc);o=self.offer(900);o['updated_at']=(t-timedelta(days=7)).isoformat()
  self.assertEqual(market_average([o],t)['average'],900)

class ApiTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  (Path(__file__).resolve().parent.parent/'data').mkdir(exist_ok=True)
  cls.temp=tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent.parent/'data');db.DB_PATH=Path(cls.temp.name)/'test.sqlite';db.seed();server.app.config['TESTING']=True
 @classmethod
 def tearDownClass(cls):cls.temp.cleanup()
 def setUp(self):self.c=server.app.test_client()
 def login(self,role='Consumer'):
  body={'email':role.lower()+'@trustmart.demo','password':'TrustMartDemo!804'}
  if role!='Consumer':
   with db.connect() as d:
    u=d.execute('SELECT totp FROM users WHERE email=?',(body['email'],)).fetchone();d.execute('UPDATE users SET last_totp=-1 WHERE email=?',(body['email'],))
   body['code']=pyotp.TOTP(u['totp']).now()
  return self.c.post('/api/login',json=body)
 def test_auth_required(self):
  for p in ['/api/catalog','/api/shops','/api/verify?code=Shop804','/api/admin','/api/supplier']:self.assertEqual(self.c.get(p).status_code,401)
 def test_consumer_forbidden(self):
  self.assertEqual(self.login().status_code,200)
  self.assertEqual(self.c.get('/api/admin').status_code,403)
  self.assertEqual(self.c.post('/api/supplier/listings',json={}).status_code,403)
 def test_admin_cannot_self_register(self):
  r=self.c.post('/api/register',json={'email':'new@test.demo','name':'New Admin','password':'SomeLongPassword!','role':'Admin'})
  self.assertEqual(r.status_code,400)
 def test_register_duplicate_and_login(self):
  data={'email':'newconsumer@test.demo','name':'Demo Consumer','password':'SomeLongPassword!','role':'Consumer'}
  self.assertEqual(self.c.post('/api/register',json=data).status_code,201)
  self.assertEqual(self.c.post('/api/register',json=data).status_code,409)
  self.assertEqual(self.c.post('/api/login',json=data).status_code,200)
 def test_mfa_mandatory(self):
  for role in ['supplier','admin']:
   self.assertEqual(self.c.post('/api/login',json={'email':role+'@trustmart.demo','password':'TrustMartDemo!804'}).status_code,401)
 def test_totp_replay_rejected(self):
  self.assertEqual(self.login('Supplier').status_code,200)
  self.c.post('/api/logout',json={})
  with db.connect() as d:secret=d.execute("SELECT totp FROM users WHERE role='Supplier'").fetchone()[0]
  self.assertEqual(self.c.post('/api/login',json={'email':'supplier@trustmart.demo','password':'TrustMartDemo!804','code':pyotp.TOTP(secret).now()}).status_code,401)
 def test_qr_resolves_same_shop_and_unknown(self):
  self.login();r=self.c.get('/api/verify?code=Shop804').json
  self.assertEqual(r['shop']['name'],'Ali Electronics')
  self.assertEqual(self.c.get('/api/verify',query_string={'code':r['qr_payload']}).json['shop']['id'],'Shop804')
  self.assertEqual(self.c.get('/api/verify?code=Unknown').status_code,404)
  self.assertEqual(self.c.get('/api/verify?code=trustmart:tampered').status_code,404)
  self.assertEqual(self.c.get('/api/verify?code=https://bad.example/steal').status_code,400)
 def test_all_statuses(self):
  self.login()
  for sid,status in [('Shop804','Verified'),('Shop811','Warning'),('Shop812','Revoked'),('Shop813','Pending')]:self.assertEqual(self.c.get('/api/verify?code='+sid).json['shop']['status'],status)
 def test_comparable_groups_and_low_confidence(self):
  self.login();d=self.c.get('/api/components/1').json
  self.assertEqual(d['pricing']['eligible'],6);self.assertEqual(d['pricing']['trimmed'],2)
  self.assertTrue(all(o['grade']=='Aftermarket A' and o['warranty']==30 for o in d['offers']))
  self.assertEqual(self.c.get('/api/components/1?grade=Refurbished&warranty=7').json['pricing']['eligible'],1)
  self.assertEqual(self.c.get('/api/components/6').json['pricing']['confidence'],'Low confidence')
 def test_supplier_submit_admin_approve_revoke(self):
  self.login('Supplier');r=self.c.post('/api/supplier/listings',json={'component_id':2,'grade':'Aftermarket B','warranty':7,'price':4500,'stock':9})
  self.assertEqual(r.status_code,200)
  with db.connect() as d:lid=d.execute("SELECT id FROM listings WHERE grade='Aftermarket B'").fetchone()[0]
  self.assertEqual(self.c.get('/api/components/2?grade=Aftermarket%20B&warranty=7').json['pricing']['eligible'],0)
  self.assertEqual(self.c.post('/api/admin/listings/'+str(lid),json={'approved':True}).status_code,403)
  self.c.post('/api/logout',json={});self.login('Admin')
  self.assertEqual(self.c.post('/api/admin/listings/'+str(lid),json={'approved':True}).status_code,200)
  self.assertEqual(self.c.get('/api/components/2?grade=Aftermarket%20B&warranty=7').json['pricing']['eligible'],1)
  self.assertEqual(self.c.post('/api/admin/shops/Shop804',json={'status':'Revoked','note':'Test audit failed compliance review.'}).status_code,200)
  self.assertEqual(self.c.get('/api/components/2?grade=Aftermarket%20B&warranty=7').json['pricing']['eligible'],0)
  self.c.post('/api/admin/shops/Shop804',json={'status':'Verified','note':'Test record restored after audit.'})
 def test_cross_origin_rejected(self):self.assertEqual(self.c.post('/api/login',json={},headers={'Origin':'https://evil.example'}).status_code,403)
 def test_session_cookie_and_logout(self):
  r=self.login();cookie=r.headers['Set-Cookie'];self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
  self.assertEqual(self.c.get('/api/me').status_code,200);self.c.post('/api/logout',json={});self.assertEqual(self.c.get('/api/me').status_code,401)
 def test_invalid_listing(self):
  self.login('Supplier');self.assertEqual(self.c.post('/api/supplier/listings',json={'component_id':1,'price':-5,'stock':2,'warranty':30,'grade':'Aftermarket A'}).status_code,400)
 def test_persistence_and_foreign_keys(self):
  with db.connect() as d:
   self.assertGreater(d.execute('SELECT count(*) FROM price_history').fetchone()[0],100)
   self.assertEqual(d.execute('PRAGMA foreign_keys').fetchone()[0],1)
 def test_demo_endpoint_off(self):
  server.DEMO=False
  try:self.assertEqual(self.c.get('/api/demo-code/Admin').status_code,404)
  finally:server.DEMO=True

if __name__=='__main__':unittest.main()
