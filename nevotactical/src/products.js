// נבו טקטיקל — 2 מוצרים, נמכרים כסט בלבד
// מחיר הסט: 400 ₪ (ניתן לעדכון מ-Firestore key: 'set')

export const PRODUCTS = [
  {
    id: 'p03',
    role: 'shirt',
    name: 'חולצה ארוכה טקטית',
    category: 'חולצות',
    description: 'חולצה טקטית קבוצת מכירה',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'],
    color1: '#0a1a0a',
    color2: '#162a16',
    letter: 'T',
    imageUrl: '/images/shirt.jpg?v=2',
  },
  {
    id: 'p05',
    role: 'pants',
    name: 'מכנסי קרגו',
    category: 'מכנסיים',
    description: 'מכנס טקטי קבוצת מכירה',
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'],
    color1: '#1e2d12',
    color2: '#2a3d1a',
    letter: 'K',
    imageUrl: '/images/cargo.jpg?v=2',
  },
];
