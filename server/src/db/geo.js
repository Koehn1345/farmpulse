// Turn a field's saved Google Maps pin into { lat, lng } for the field map.
// Handles plain "lat, lng" text, full Google Maps URLs (@lat,lng / q= / ll= /
// !3d..!4d..), and short share links (maps.app.goo.gl, goo.gl/maps), which
// are followed to their full URL. Results are cached in memory per link.

const cache = new Map();

const valid = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';
const PATTERNS = [
  new RegExp(`!3d${NUM}!4d${NUM}`),                       // exact pin location in place URLs
  new RegExp(`[?&](?:q|query|ll|center|destination|daddr)=(?:loc:)?${NUM}(?:,|%2C)\\s*(?:\\+)?${NUM}`, 'i'),
  new RegExp(`/search/${NUM}(?:,|%2C)\\s*\\+?${NUM}`, 'i'),
  new RegExp(`/place/${NUM}(?:,|%2C)\\s*\\+?${NUM}`, 'i'),
  new RegExp(`@${NUM},${NUM}`),                            // map viewport center
  new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`),           // plain "lat, lng"
];

export function parseCoords(text) {
  if (!text) return null;
  let s = String(text);
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  for (const re of PATTERNS) {
    const m = s.match(re);
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

// Only ever follow Google's own short-link hosts.
const SHORT_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|g\.co)$/i;

async function expandShortLink(url) {
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  if (!SHORT_HOSTS.test(u.hostname)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(u, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 FarmPulse' } });
    // The final URL usually carries the coordinates; a consent page wraps it in ?continue=
    const finalUrl = res.url || '';
    const cont = (() => { try { return new URL(finalUrl).searchParams.get('continue'); } catch { return null; } })();
    const fromUrl = parseCoords(finalUrl) || parseCoords(cont);
    if (fromUrl) return fromUrl;
    const body = (await res.text()).slice(0, 500000);
    return parseCoords(body.match(/https:\/\/www\.google\.com\/maps[^"'\s\\]+/)?.[0]) || parseCoords(body);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function pinCoords(pin) {
  if (!pin) return null;
  const key = pin.trim();
  if (cache.has(key)) return cache.get(key);
  const coords = parseCoords(key) || await expandShortLink(key);
  // Editing a pin changes the key, so a stale entry is never served for a new link.
  cache.set(key, coords);
  return coords;
}
