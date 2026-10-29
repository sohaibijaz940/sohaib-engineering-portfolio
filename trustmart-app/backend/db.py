import os, sqlite3, secrets, json
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime, timezone, timedelta
import bcrypt, pyotp

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get('TRUSTMART_DB', ROOT/'data'/'trustmart.sqlite'))
@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.execute('PRAGMA journal_mode=WAL')
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
def now(): return datetime.now(timezone.utc).isoformat()
def init():
    with connect() as d:
        d.executescript('''
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password BLOB NOT NULL,role TEXT CHECK(role IN ('Consumer','Supplier','Admin')) NOT NULL,totp TEXT,created_at TEXT NOT NULL,last_totp INTEGER DEFAULT -1);
        CREATE TABLE IF NOT EXISTS shops(id TEXT PRIMARY KEY,user_id INTEGER UNIQUE REFERENCES users(id),name TEXT NOT NULL,owner TEXT NOT NULL,market TEXT NOT NULL,address TEXT NOT NULL,description TEXT NOT NULL,hours TEXT NOT NULL,specialties TEXT NOT NULL,status TEXT CHECK(status IN ('Verified','Warning','Revoked','Pending')) NOT NULL,score INTEGER NOT NULL,reason TEXT NOT NULL,updated_at TEXT NOT NULL,qr_token TEXT UNIQUE NOT NULL);
        CREATE TABLE IF NOT EXISTS components(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,model TEXT NOT NULL,description TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS listings(id INTEGER PRIMARY KEY,shop_id TEXT NOT NULL REFERENCES shops(id),component_id INTEGER NOT NULL REFERENCES components(id),grade TEXT NOT NULL,warranty INTEGER NOT NULL,price INTEGER CHECK(price>0) NOT NULL,stock INTEGER CHECK(stock>=0) NOT NULL,approved INTEGER DEFAULT 0,updated_at TEXT NOT NULL,UNIQUE(shop_id,component_id,grade,warranty));
        CREATE TABLE IF NOT EXISTS price_history(id INTEGER PRIMARY KEY,listing_id INTEGER REFERENCES listings(id),price INTEGER NOT NULL,created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS audits(id INTEGER PRIMARY KEY,actor_id INTEGER REFERENCES users(id),shop_id TEXT REFERENCES shops(id),action TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY,email TEXT,ip TEXT,success INTEGER,created_at TEXT);
        ''')
def _seed_legacy():
    init()
    with connect() as d:
        if d.execute('SELECT count(*) FROM users').fetchone()[0]: return
        pwd=bcrypt.hashpw(b'TrustMartDemo!804',bcrypt.gensalt())
        for email,name,role,totp in [('consumer@trustmart.demo','Ayesha Khan','Consumer',None),('supplier@trustmart.demo','Ali Hassan','Supplier','JBSWY3DPEHPK3PXP'),('admin@trustmart.demo','TrustMart Auditor','Admin','KRSXG5DSNFXGOIDB')]:
            d.execute('INSERT INTO users(email,name,password,role,totp,created_at) VALUES(?,?,?,?,?,?)',(email,name,pwd,role,totp,now()))
        names=['Ali Electronics','Circuit House','Hall Road Components','Pixel Parts Lab','Gulberg Mobile Works','The Repair Collective','Metro Component Co.','Atlas Mobile Supply','New Horizon Parts']
        statuses=['Verified']*6+['Warning','Revoked','Pending']
        for i,(name,status) in enumerate(zip(names,statuses)):
            sid='Shop804' if i==0 else f'Shop{805+i}'
            market='Hafeez Center' if i%2==0 else 'Hall Road'
            d.execute('INSERT INTO shops VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(sid,2 if i==0 else None,name,'Ali Hassan' if i==0 else f'Demo proprietor {i+1}',market,f'Unit D-{12+i}, {market}, Lahore (fictional address)',f'A fictional specialist in smartphone repair components at {market}. Sample supplier profile for demonstrating transparent pricing, compatibility checks, and an auditable verification record.','Mon–Sat · 11:00–20:00 PKT','Displays, batteries, charging assemblies',status,98-i*4,'Sample audit: documentation and pricing reviewed.' if status=='Verified' else {'Warning':'Sample audit: price accuracy requires review.','Revoked':'Sample audit: failed compliance review. Do not rely on this supplier.','Pending':'Application received; no verification granted.'}[status],now(),secrets.token_urlsafe(24)))
            d.execute('INSERT INTO audits(actor_id,shop_id,action,note,created_at) VALUES(3,?,?,?,?)',(sid,status,'FICTIONAL seed audit; no real business was assessed.',now()))
        components=[('iPhone 13 Display','Display','iPhone 13','6.1-inch OLED replacement assembly. Confirm exact device variant before repair.'),('iPhone 13 Battery','Battery','iPhone 13','Replacement battery assembly; capacity and condition must be checked by your technician.'),('Samsung A52 Display','Display','Samsung A52','6.5-inch replacement display assembly, A525 variant.'),('iPhone 12 Charging Port','Charging','iPhone 12','Lightning charging flex assembly for iPhone 12.'),('Samsung A52 Camera','Camera','Samsung A52','Rear camera replacement module for A525.'),('Redmi Note 10 Battery','Battery','Redmi Note 10','Replacement battery assembly for Redmi Note 10.')]
        d.executemany('INSERT INTO components(name,category,model,description) VALUES(?,?,?,?)',components)
        for c,base in enumerate([18500,4200,12800,2800,6100,3100],1):
            for i in range(9):
                sid='Shop804' if i==0 else f'Shop{805+i}'
                price=base+[0,600,-400,900,-800,200,4000,-3000,100][i]
                price=max(500,price)
                stamp=now() if not(c==6 and i>1) else (datetime.now(timezone.utc)-timedelta(days=12)).isoformat()
                cur=d.execute('INSERT INTO listings(shop_id,component_id,grade,warranty,price,stock,approved,updated_at) VALUES(?,?,?,30,?,?,?,?)',(sid,c,'Aftermarket A',price,8+i,1 if i<8 else 0,stamp))
                for days,mult in [(14,1.08),(7,1.04),(0,1)]:
                    d.execute('INSERT INTO price_history(listing_id,price,created_at) VALUES(?,?,?)',(cur.lastrowid,round(price*mult),(datetime.now(timezone.utc)-timedelta(days=days)).isoformat()))
        d.execute('INSERT INTO listings(shop_id,component_id,grade,warranty,price,stock,approved,updated_at) VALUES(\'Shop804\',1,\'Refurbished\',7,13000,3,1,?)',(now(),))
def seed():
    _seed_legacy()
    from marketplace import migrate
    migrate()

if __name__=='__main__':
    seed(); print(f'Seeded fictional data in {DB_PATH}')

