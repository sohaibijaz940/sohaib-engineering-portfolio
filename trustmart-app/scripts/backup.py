"""Safe online SQLite backup. Run from project root: python scripts/backup.py."""
from pathlib import Path
from datetime import datetime,timezone
import sys,sqlite3
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'backend'))
from db import connect,ROOT
folder=ROOT/'backups';folder.mkdir(exist_ok=True)
target=folder/('trustmart-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.sqlite')
with connect() as source:
 with sqlite3.connect(target) as backup:
  source.backup(backup)
  assert backup.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
print(target)
