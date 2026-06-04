import sys
sys.path.insert(0, '/home/ubuntu/smartcard/backend')
from database import SessionLocal
from models import Store

db = SessionLocal()
TOV_BRAND_ID = 11

stores = [
    # אופנה וקניות
    'Foot Locker', 'MANGO', 'BILLABONG', 'aerie', 'AMERICAN EAGLE',
    'ריקשו', 'GOLF&CO', 'GOLF&KIDS', 'GOLF', 'THE CHILDREN\'S PLACE', 'FOX home',
    'femina', 'STEVE MADDEN', 'YOLO', 'הלפרין', 'גנה ספורט',
    'נעמן', 'VARDINON', 'עגליס', 'FACTORY54',
    'nimrod', 'INTER JEANS', 'Afrodita', 'Bonita & Mas', 'havaianas', 'נאות',
    'INTIMA', 'Timberland', 'NAUTICA', 'EMPORIUM', 'Desigual', 'TOUS',
    'NINE WEST', 'Le Lu', 'REPLAY', 'kitan', 'POLGAT',
    'LACOSTE', 'MICHAEL KORS', 'TOMMY HILFIGER', 'Calvin Klein', "Levi's", 'PUMA',
    'food appeal', 'SOLTAM', 'POLO RALPH LAUREN', 'ICE CUBE', 'RUBY BAY', 'Sunglass Hut',
    'ARMANI EXCHANGE', 'ARCOSTEEL', 'EMPORIO ARMANI', 'EA7 EMPORIO ARMANI', 'Superdry', 'Crazy Line',
    'Galt', 'GUESS', 'PETIT BATEAU', 'HUGO BOSS', 'papaya', 'easy spirit',
    'ALDO', 'HOMESTYLE', 'MASHBIR', 'H&O Brands Collection', 'טנוסנו',
    'Spices', 'Flying Tiger Copenhagen', 'yanga', 'BabyStar', 'אלוף ספורט',
    'B.unique', 'erroca', 'IL MAKIAGE', 'CHOZEN',
    'TERMINAL 1', 'THE NORTH FACE', 'VANS', 'SABON',
    'PERFUMERI', 'PLATIN', 'AUTODEPOT', 'URBAN DESIGN FOR LESS', 'בירלי', 'FOX',
    'ZER4YOU', 'adidas', 'Olympia', 'CALZEDONIA', 'intimissimi', 'ACE',
    'Lenovo', 'COOK & BAKE', 'FLYBYFLY',
    # מזון ומסעדות
    'Chooko', 'cafe greg', "McDonald's", 'Pretzels', "Domino's",
    'KANSAI', 'WOK TO WALK', 'מקסיקנה', 'greg cafe', 'AMARO', 'לכדוור',
    'שוק הבשר', 'OREN MESH', 'The Lucky Chicken', 'Burgerim',
]

existing = {s.name.lower() for s in db.query(Store).filter(Store.brand_id == TOV_BRAND_ID).all()}
added = 0
for name in stores:
    if name.lower() not in existing:
        db.add(Store(name=name, brand_id=TOV_BRAND_ID))
        added += 1

db.commit()
total = db.query(Store).filter(Store.brand_id == TOV_BRAND_ID).count()
print(f'Added {added} new stores. Total Tov stores: {total}')
