import sys
sys.path.insert(0, '/home/ubuntu/smartcard/backend')
from database import SessionLocal
from models import Store

db = SessionLocal()
TAV_BRAND_ID = 1

stores = [
    # Fashion & clothing
    'Renuar', 'FOX', 'FOX HOME', "Carter's", 'Crazy Line', 'lamina', 'papaya', 'Factory54',
    'NAUTICA', 'NINE WEST', 'nimrod', 'TOUS', 'Timberland', 'Mi.bebe', 'MANGO', 'Longchamp',
    'HOODIES', 'HOMESTYLE', 'MASHBIR', 'VANS', 'VARDINON', 'NAOT', 'Desigual',
    'GOLF&CO', 'GOLF&KIDS', 'Gali', 'JACK KUBA', 'COLBARY', 'GOLF', 'EMPORIUM',
    'AMERICAN EAGLE', 'adidas', 'APRIL', 'aerie', 'BODY SHOP', 'Le Coq Sportif',
    'TOMMY HILFIGER', 'kitan', 'SUPERDRY', 'STEVE MADDEN', 'Foot Locker', 'Naaman',
    # Image 2
    'ACE', 'ICE CUBE', 'H&O', 'H&M HOME', 'ALDO', 'POLGAT', 'POLO RALPH LAUREN',
    'Sunglass Hut', 'INTIMA', 'SHOW OFF', 'AMOR', 'URBAN', 'idesign', 'Lee', 'PUMA',
    'Morgan', 'ARMANI EXCHANGE', 'EMPORIO ARMANI', 'HUGO', 'Calvin Klein',
    'MICHAEL KORS', 'BOSS', 'BIMBA Y LOLA', ':story', 'B.unique', 'Wrangler',
    'Saucony', 'TAKE A NAP', 'BOGGART', 'GUESS', 'Diesel', "Levi's", 'BROWNIE',
    'DKNY', 'INTER JEANS', 'H&M', 'YVES ROCHER', 'Afrodita', 'dynamics',
    # Online stores
    'papaya Online', 'Hortell HOME Online', 'Yves Rocher Online', 'TERMINAL X Online',
    'FOX HOME Online', 'Hortell Online', 'שופרסל Online', 'Foot Locker Online',
    'Minene Online', 'מגה ספלוט Online', ':story Online', 'FOREVER 21 Online',
    'ONE PROJECT Online', 'H&O Online', 'FOX Online',
    # Restaurants
    'Bar Italia', 'Gustino', 'Mateo', 'Sayonara', 'שגב', 'Frame', 'PO MO', 'River',
    'Jagha', 'La Vaca Loca', 'agenda', 'OLIVERY', 'PUZZLE BURGER', 'HUMONGOUS',
]

existing = {s.name.lower() for s in db.query(Store).filter(Store.brand_id == TAV_BRAND_ID).all()}
added = 0
for name in stores:
    if name.lower() not in existing:
        db.add(Store(name=name, brand_id=TAV_BRAND_ID))
        added += 1

db.commit()
total = db.query(Store).filter(Store.brand_id == TAV_BRAND_ID).count()
print(f'Added {added} new stores. Total Tav Hazahav stores: {total}')
