import { useState } from 'react';
import { Box, Typography, IconButton, Chip, Divider } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    iconName: 'credit',
    title: 'ניהול שוברים',
    color: '#00897B',
    items: [
      { q: 'איך מוסיפים שובר חדש?', a: 'לחץ על כפתור ה-+ הירוק בתחתית המסך. תוכל למלא את פרטי השובר ידנית או לסרוק תמונה אוטומטית.' },
      { q: 'אילו סוגי מדיה ניתן לצרף לשובר?', a: 'שלושה סוגים:\n• לינק – קישור לשובר דיגיטלי\n• תמונה (URL) – קישור לתמונה חיצונית\n• העלאת תמונה – תמונה מהמכשיר שלך' },
      { q: 'איך מעדכנים יתרה?', a: 'לחץ על השובר ברשימה → לחץ על סכום היתרה → הזן את הסכום החדש ולחץ אישור.' },
      { q: 'מה קורה כששובר מגיע ל-₪0?', a: 'השובר מסומן כ"נוצל" ונעלם מהרשימה הראשית. ניתן לראות שוברים שנוצלו בפילטר.' },
      { q: 'איך מוחקים שובר?', a: 'פתח את פרטי השובר → לחץ על אייקון העריכה → לחץ "מחק שובר".' }
    ]
  },
  {
    iconName: 'camera',
    title: 'סריקה חכמה (AI)',
    color: '#1565C0',
    items: [
      { q: 'איך עובדת הסריקה?', a: 'לחץ "צלם כרטיס" בדף הוספת שובר. האפליקציה שולחת את התמונה לבינה מלאכותית (Mistral Vision) שמחלצת אוטומטית: יתרה, תאריך תוקף ושם המותג.' },
      { q: 'מה עושים אם הסריקה לא מדויקת?', a: 'ניתן לערוך את הנתונים שחולצו ידנית לפני שמירת השובר. הסריקה היא עזר בלבד.' },
      { q: 'למה לפעמים מקבלים שגיאת "המתן 30 שניות"?', a: 'השירות חינמי ומוגבל בקצב בקשות. אם סרקת מספר תמונות בזמן קצר, יש להמתין כ-30 שניות ולנסות שוב.' },
      { q: 'האם התמונה נשמרת?', a: 'כן! בעת סריקה, התמונה מצורפת אוטומטית לשובר ונשמרת בשרת.' }
    ]
  },
  {
    iconName: 'group',
    title: 'קבוצות ושיתוף',
    color: '#6A1B9A',
    items: [
      { q: 'איך יוצרים קבוצה?', a: 'לחץ על אייקון הקבוצות (אנשים) בראש המסך → "צור קבוצה חדשה" → הזן שם.' },
      { q: 'איך מזמינים חברים לקבוצה?', a: 'בדף הקבוצות → לחץ על אייקון השיתוף ליד הקבוצה → שלח את הקישור לחברים. מי שלוחץ על הקישור מצטרף אוטומטית.' },
      { q: 'איך מוסיפים שובר לקבוצה?', a: 'בעת הוספת שובר, בחר קבוצה מהרשימה. כל חברי הקבוצה יוכלו לראות ולעדכן את השובר.' },
      { q: 'מי יכול לראות את השוברים שלי?', a: 'שוברים אישיים נראים רק לך. שוברים בקבוצה נראים לכל חברי אותה קבוצה בלבד.' }
    ]
  },
  {
    iconName: 'security',
    title: 'אבטחה וחשבון',
    color: '#C62828',
    items: [
      { q: 'מה זה אימות דו-שלבי (2FA)?', a: 'שכבת הגנה נוספת מעבר לסיסמה. לאחר הפעלה, בכל כניסה תצטרך להזין קוד חד-פעמי מאפליקציית Google Authenticator.' },
      { q: 'איך מפעילים אימות דו-שלבי?', a: 'לחץ על אייקון המנעול בראש המסך → "הגדר אימות דו-שלבי" → סרוק את ה-QR עם Google Authenticator → הזן קוד לאישור.' },
      { q: 'מתי האפליקציה מתנתקת אוטומטית?', a: 'לאחר 30 דקות של חוסר פעילות, תנותק אוטומטית לאבטחת חשבונך.' },
      { q: 'מה לעשות אם שכחתי סיסמה?', a: 'כרגע אין אפשרות שחזור סיסמה אוטומטית. פנה למנהל המערכת.' }
    ]
  },
  {
    iconName: 'edit',
    title: 'מותגים',
    color: '#E65100',
    items: [
      { q: 'איך מוסיפים מותג חדש?', a: 'בדף הוספת שובר → בחר "הוסף מותג חדש" מהרשימה → הזן את שם המותג.' },
      { q: 'איך מוחקים מותג?', a: 'בדף הוספת שובר → פתח את רשימת המותגים → לחץ ✕ ליד המותג שברצונך למחוק.' }
    ]
  }
];

function SectionIcon({ name, color }) {
  const sx = { color, fontSize: 22 };
  if (name === 'credit') return <CreditCardIcon sx={sx} />;
  if (name === 'camera') return <CameraAltIcon sx={sx} />;
  if (name === 'group') return <GroupIcon sx={sx} />;
  if (name === 'security') return <SecurityIcon sx={sx} />;
  return <EditIcon sx={sx} />;
}

function QAItem({ item, isOpen, onToggle }) {
  return (
    <Box
      sx={{
        mb: 0.5,
        borderRadius: '10px',
        bgcolor: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}
    >
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{item.q}</Typography>
        {isOpen ? <ExpandLessIcon sx={{ color: '#999', fontSize: 20, ml: 1 }} /> : <ExpandMoreIcon sx={{ color: '#999', fontSize: 20, ml: 1 }} />}
      </Box>
      {isOpen && (
        <Box sx={{ px: 2, pb: 2, borderTop: '1px solid #F0F0F0' }}>
          <Typography sx={{ fontSize: 14, color: '#555', whiteSpace: 'pre-line', lineHeight: 1.8, pt: 1.5 }}>
            {item.a}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);

  const toggle = (key) => setExpanded(prev => prev === key ? null : key);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F5F5', direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #00897B 0%, #00695C 100%)',
        pt: 5, pb: 4, px: 3, position: 'relative'
      }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ position: 'absolute', top: 16, right: 16, color: 'white' }}
        >
          <ArrowForwardIcon />
        </IconButton>
        <Typography variant='h5' sx={{ color: 'white', fontWeight: 700, mt: 2 }}>
          מרכז העזרה
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5, fontSize: 14 }}>
          SmartCard – ניהול שוברים חכם
        </Typography>
      </Box>

      {/* Version chips */}
      <Box sx={{ px: 3, py: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label='גרסה 1.0.4' size='small' />
        <Chip label='Mistral Vision AI' size='small' color='primary' variant='outlined' />
        <Chip label='2FA' size='small' color='success' variant='outlined' />
        <Chip label='HTTPS' size='small' color='warning' variant='outlined' />
      </Box>

      {/* Sections */}
      <Box sx={{ px: 2, pb: 4 }}>
        {sections.map((section, si) => (
          <Box key={si} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1.5 }}>
              <SectionIcon name={section.iconName} color={section.color} />
              <Typography sx={{ fontWeight: 700, color: section.color, fontSize: 16 }}>
                {section.title}
              </Typography>
            </Box>
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              return (
                <QAItem
                  key={key}
                  item={item}
                  isOpen={expanded === key}
                  onToggle={() => toggle(key)}
                />
              );
            })}
            {si < sections.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}

        {/* Changelog */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#333', mb: 1 }}>עדכוני גרסאות</Typography>
          <Typography sx={{ fontSize: 12, color: '#555', mb: 0.5 }}><strong>1.0.4</strong> – שכחתי סיסמה: איפוס סיסמה במייל, כפתור רענון בדשבורד, שוברים קבוצתיים בדשבורד הראשי</Typography>
          <Typography sx={{ fontSize: 12, color: '#555', mb: 0.5 }}><strong>1.0.3</strong> – אבטחה: Rate limiting על כניסה, אימות קבצים משופר, הגנה על מחיקת מותגים, ולידציה על שדות URL</Typography>
          <Typography sx={{ fontSize: 12, color: '#555', mb: 0.5 }}><strong>1.0.2</strong> – אבטחה: Cookie מאובטח במקום localStorage + הגבלת גודל קבצים ל-10MB</Typography>
          <Typography sx={{ fontSize: 12, color: '#555', mb: 0.5 }}><strong>1.0.1</strong> – מעבר ל-HTTPS: כל התקשורת מאובטחת בהצפנה מלאה (SSL)</Typography>
          <Typography sx={{ fontSize: 12, color: '#999' }}><strong>1.0.0</strong> – השקה ראשונית</Typography>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'white', borderRadius: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: '#999' }}>
            SmartCard – פותח ב-React + FastAPI
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#777', mt: 0.5, fontWeight: 600 }}>
            נבנה ע"י גדי אלון
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#bbb', mt: 0.5 }}>
            לתמיכה פנה למנהל המערכת
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
