import emailjs from '@emailjs/browser';

// ─── FILL THESE IN AFTER EmailJS SETUP ───────────────────────────────────────
export const EMAILJS_CONFIG = {
  serviceId:  '',   // e.g. 'service_abc123'
  templateId: '',   // e.g. 'template_xyz789'
  publicKey:  '',   // e.g. 'AbCdEfGhIjKlMnOp'
};

export function isEmailConfigured() {
  return EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId && EMAILJS_CONFIG.publicKey;
}

// ─── TEMPLATE PARAMS BUILDERS ─────────────────────────────────────────────────

function deliveryText(order) {
  if (order.deliveryType === 'pickup') return 'איסוף עצמי';
  return [order.city, order.address, order.zip].filter(Boolean).join(', ') || '—';
}

function setsText(sets) {
  return (sets || [])
    .map(s => `חולצה ${s.shirtSize} / מכנסיים ${s.pantsSize}${s.quantity > 1 ? ` × ${s.quantity}` : ''}`)
    .join('\n');
}

const STATUS_CONFIG = {
  new: {
    subject:    order => `הזמנה #${order.orderNumber} התקבלה — נבו טקטיקל`,
    badge:      'הזמנה התקבלה ✓',
    headline:   order => `שלום ${order.name}, קיבלנו את הזמנתך!`,
    body:       'נצור קשר בהקדם לאישור תשלום ופרטי משלוח.',
  },
  paid: {
    subject:    order => `הזמנה #${order.orderNumber} — תשלום אושר`,
    badge:      '₪ תשלום אושר',
    headline:   order => `שלום ${order.name}, התשלום אושר!`,
    body:       'ההזמנה בהכנה לשליחה. נעדכן כשיצא לדרך.',
  },
  sent: {
    subject:    order => `הזמנה #${order.orderNumber} ${order.deliveryType === 'pickup' ? '— מוכנה לאיסוף' : 'נשלחה!'}`,
    badge:      order => order.deliveryType === 'pickup' ? 'מוכן לאיסוף ✓' : 'נשלח ✓',
    headline:   order => `שלום ${order.name}, ${order.deliveryType === 'pickup' ? 'הזמנתך מוכנה לאיסוף!' : 'הזמנתך בדרך אליך!'}`,
    body:       order => order.deliveryType === 'pickup'
      ? 'נשמח לתאם זמן נוח לאיסוף.'
      : 'הציוד שלך יצא לדרך. לשאלות — השב למייל זה.',
  },
};

function buildParams(order, trigger) {
  const cfg = STATUS_CONFIG[trigger];
  const badge    = typeof cfg.badge    === 'function' ? cfg.badge(order)    : cfg.badge;
  const headline = typeof cfg.headline === 'function' ? cfg.headline(order) : cfg.headline;
  const body     = typeof cfg.body     === 'function' ? cfg.body(order)     : cfg.body;

  return {
    to_email:      order.email,
    subject:       cfg.subject(order),
    badge,
    headline,
    body_text:     body,
    order_number:  String(order.orderNumber),
    customer_name: order.name,
    phone:         order.phone,
    sets_list:     setsText(order.sets),
    total:         `₪${order.total || 0}`,
    delivery:      deliveryText(order),
  };
}

// ─── MAIN SEND FUNCTION ───────────────────────────────────────────────────────

export async function sendOrderEmail(order, trigger) {
  if (!isEmailConfigured()) return;
  if (!order?.email) return;
  const params = buildParams(order, trigger);
  await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    params,
    { publicKey: EMAILJS_CONFIG.publicKey },
  );
}
