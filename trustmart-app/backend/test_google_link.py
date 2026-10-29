import os,json,hashlib,unittest
from urllib.parse import urlparse,parse_qs
from unittest.mock import patch,MagicMock
import test_transparency as base
import db,server

class GoogleLinkTests(unittest.TestCase):
 setUp=base.TransparencyTests.setUp
 tearDown=base.TransparencyTests.tearDown
 login=base.TransparencyTests.login
 def test_secure_google_account_link(self):
  with patch.dict(os.environ,{'GOOGLE_CLIENT_ID':'test-id','GOOGLE_CLIENT_SECRET':'test-secret','TRUSTMART_PUBLIC_URL':'http://localhost'}):
   self.assertEqual(self.c.get('/api/auth/google/start?link=1').status_code,403)
   self.login()
   self.assertEqual(self.c.get('/api/auth/google/start?link=1').status_code,403)
   with db.connect() as d:d.execute("UPDATE users SET email='owner@example.test' WHERE email='consumer@trustmart.demo'")
   r=self.c.get('/api/auth/google/start?link=1');self.assertEqual(r.status_code,302)
   state=parse_qs(urlparse(r.location).query)['state'][0]
   with db.connect() as d:nonce=d.execute('SELECT nonce FROM oauth_states WHERE state_hash=?',(hashlib.sha256(state.encode()).hexdigest(),)).fetchone()[0]
   response=MagicMock();response.__enter__.return_value.read.return_value=json.dumps({'id_token':'mock-token'}).encode()
   identity={'sub':'google-sub','email':'owner@example.test','email_verified':True,'iss':'https://accounts.google.com','nonce':nonce}
   with patch('google_login.urllib.request.urlopen',return_value=response),patch('google.oauth2.id_token.verify_oauth2_token',return_value=identity):
    r=self.c.get('/api/auth/google/callback?state='+state+'&code=mock-code')
   self.assertTrue(r.location.endswith('/#products'),r.location)
   self.assertEqual(self.c.get('/api/me').json['user']['email'],'owner@example.test')
   with db.connect() as d:self.assertEqual(d.execute('SELECT count(*) FROM google_identities').fetchone()[0],1)
 def test_wrong_google_email_cannot_link(self):
  with patch.dict(os.environ,{'GOOGLE_CLIENT_ID':'test-id','GOOGLE_CLIENT_SECRET':'test-secret','TRUSTMART_PUBLIC_URL':'http://localhost'}):
   self.login()
   with db.connect() as d:d.execute("UPDATE users SET email='owner@example.test' WHERE email='consumer@trustmart.demo'")
   r=self.c.get('/api/auth/google/start?link=1');state=parse_qs(urlparse(r.location).query)['state'][0]
   with db.connect() as d:nonce=d.execute('SELECT nonce FROM oauth_states WHERE state_hash=?',(hashlib.sha256(state.encode()).hexdigest(),)).fetchone()[0]
   response=MagicMock();response.__enter__.return_value.read.return_value=b'{"id_token":"mock-token"}'
   identity={'sub':'other-sub','email':'other@example.test','email_verified':True,'iss':'https://accounts.google.com','nonce':nonce}
   with patch('google_login.urllib.request.urlopen',return_value=response),patch('google.oauth2.id_token.verify_oauth2_token',return_value=identity):r=self.c.get('/api/auth/google/callback?state='+state+'&code=mock-code')
   self.assertIn('google_link_account_mismatch',r.location)
   with db.connect() as d:self.assertEqual(d.execute('SELECT count(*) FROM google_identities').fetchone()[0],0)
