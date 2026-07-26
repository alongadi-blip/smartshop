import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';

const CITIES = [
  { id: 'all', label: 'כל הערים' },
  { id: 'jerusalem', label: 'ירושלים' },
  { id: 'modiin', label: 'מודיעין' },
  { id: 'mevaseret', label: 'מבשרת ציון' },
];

const CATEGORIES = [
  { id: 'all', label: 'הכול' },
  { id: 'music', label: 'מוזיקה' },
  { id: 'theater', label: 'תיאטרון' },
  { id: 'standup', label: 'סטנדאפ' },
  { id: 'kids', label: 'ילדים' },
  { id: 'other', label: 'אחר' },
];

const dateFormatter = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const timeFormatter = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return { date: dateFormatter.format(d), time: timeFormatter.format(d) };
}

function EventCard({ event }) {
  const { date, time } = formatDate(event.date);
  const categoryMeta = CATEGORIES.find((c) => c.id === event.category) ?? CATEGORIES[CATEGORIES.length - 1];

  return (
    <article className="card">
      <div className="card-image">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} loading="lazy" />
        ) : (
          <div className="card-image-fallback" aria-hidden="true" />
        )}
        <span className={`badge badge-${event.category}`}>{categoryMeta.label}</span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{event.title}</h3>
        <p className="card-meta">
          <span>{event.venue}</span>
          <span className="dot" aria-hidden="true">•</span>
          <span>{event.cityLabel}</span>
        </p>
        <p className="card-datetime">
          <span>{date}</span>
          {time && (
            <>
              <span className="dot" aria-hidden="true">•</span>
              <span>{time}</span>
            </>
          )}
        </p>
        <div className="card-footer">
          {event.price != null ? (
            <span className="card-price">₪{event.price}</span>
          ) : (
            <span className="card-price card-price-muted">מחיר באתר</span>
          )}
          <a className="card-cta" href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
            כרטיסים
          </a>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="card card-skeleton" aria-hidden="true">
      <div className="card-image card-image-fallback" />
      <div className="card-body">
        <div className="skel-line skel-title" />
        <div className="skel-line skel-short" />
        <div className="skel-line skel-short" />
      </div>
    </div>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [city, setCity] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, 'events'), orderBy('date', 'asc')));
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const term = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (new Date(ev.date).getTime() < now) return false;
      if (city !== 'all' && ev.city !== city) return false;
      if (category !== 'all' && ev.category !== category) return false;
      if (term) {
        const haystack = `${ev.title} ${ev.venue}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [events, city, category, search]);

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">ירושלים · מודיעין · מבשרת ציון</p>
        <h1>ShowFinder</h1>
        <p className="tagline">כל ההופעות, ההצגות והמופעים באזור שלך — במקום אחד</p>
      </header>

      <div className="filters">
        <div className="filter-row">
          {CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pill ${city === c.id ? 'pill-active' : ''}`}
              onClick={() => setCity(c.id)}
              aria-pressed={city === c.id}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pill pill-outline ${category === c.id ? 'pill-active' : ''}`}
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="search-row">
          <label htmlFor="search" className="sr-only">חיפוש הופעה או אולם</label>
          <input
            id="search"
            type="search"
            placeholder="חיפוש לפי שם הופעה או אולם..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <main className="results">
        {error && <p className="state-message error">שגיאה בטעינת האירועים: {error}</p>}

        {loading && (
          <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="state-message">לא נמצאו אירועים תואמים. נסו לשנות את הסינון.</p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid">
            {filtered.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>המידע נאסף אוטומטית מ־Tickchak ומתעדכן מספר פעמים ביום. לרכישת כרטיסים תועברו לאתר המקור.</p>
      </footer>
    </div>
  );
}
