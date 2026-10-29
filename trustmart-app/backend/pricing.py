"""Comparable offers only; one current offer per supplier, fixed-point PKR."""
from datetime import datetime, timezone, timedelta

def market_average(offers, now=None):
    now = now or datetime.now(timezone.utc)
    eligible = []
    for o in offers:
        if o['status'] != 'Verified' or not o['approved'] or o['stock'] <= 0:
            continue
        stamp = datetime.fromisoformat(o['updated_at'])
        if stamp > now or stamp < now - timedelta(days=7):
            continue
        eligible.append(o)
    # The DB unique constraint guarantees one listing per supplier/component/grade/warranty.
    eligible.sort(key=lambda o: o['price'])
    count = len(eligible)
    trim = int(count * .2) if count >= 5 else 0
    used = eligible[trim:count-trim] if trim else eligible
    return {'average': round(sum(o['price'] for o in used)/len(used)) if used else None,
            'eligible': count, 'used': len(used), 'trimmed': trim*2,
            'confidence': 'Sample only' if count >= 5 else 'Low confidence',
            'last_updated': max((o['updated_at'] for o in eligible), default=None),
            'method': '20% trimmed mean per tail for 5+ comparable offers; otherwise untrimmed mean. Verified, approved, in-stock offers updated within 7 days only.',
            'fictional': True}
