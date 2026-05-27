// נבו טקטיקל — 2 מוצרים, נמכרים כסט בלבד
// מחירים ניתנים לעדכון מ-Firestore (admin panel)

export const PRODUCTS = [
  {
    id: 'p03',
    role: 'shirt',                     // תפקיד בסט
    name: 'חולצה ארוכה טקטית',
    category: 'חולצות',
    description: 'שרוול ארוך עם רוכסן חצי, בד מתיחה דו-כיווני, ייבוש מהיר',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    price: 200,
    color1: '#0a1a0a',
    color2: '#162a16',
    letter: 'T',
    imageUrl: '/images/shirt.jpg?v=2',
  },
  {
    id: 'p05',
    role: 'pants',                     // תפקיד בסט
    name: 'מכנסי קרגו',
    category: 'מכנסיים',
    description: '6 כיסים, בד Ripstop עמיד, חגורה מתכווננת',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    price: 300,
    color1: '#1e2d12',
    color2: '#2a3d1a',
    letter: 'K',
    imageUrl: '/images/cargo.jpg?v=2',
  },
];
