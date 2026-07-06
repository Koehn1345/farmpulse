// All API calls automatically include the Clerk session token
let _getToken = null;

export function setTokenGetter(fn) {
  _getToken = fn;
}

async function req(method, path, body) {
  const token = _getToken ? await _getToken() : null;
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Permission denied');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  farm: {
    get: () => req('GET', '/farm'),
    update: (b) => req('PUT', '/farm', b),
  },
  team: {
    list: () => req('GET', '/team'),
    setRole: (clerkUserId, role) => req('PUT', `/team/${clerkUserId}/role`, { role }),
  },
  dashboard: () => req('GET', '/dashboard'),
  customers: {
    list: () => req('GET', '/customers'),
    create: (b) => req('POST', '/customers', b),
    update: (id, b) => req('PUT', `/customers/${id}`, b),
    delete: (id) => req('DELETE', `/customers/${id}`),
  },
  fields: {
    list: () => req('GET', '/fields'),
    create: (b) => req('POST', '/fields', b),
    update: (id, b) => req('PUT', `/fields/${id}`, b),
    delete: (id) => req('DELETE', `/fields/${id}`),
  },
  cropHistory: {
    list: () => req('GET', '/crop-history'),
    create: (b) => req('POST', '/crop-history', b),
    update: (id, b) => req('PUT', `/crop-history/${id}`, b),
    delete: (id) => req('DELETE', `/crop-history/${id}`),
  },
  commodities: {
    list: () => req('GET', '/commodities'),
    create: (b) => req('POST', '/commodities', b),
    update: (id, b) => req('PUT', `/commodities/${id}`, b),
    delete: (id) => req('DELETE', `/commodities/${id}`),
  },
  loads: {
    list: () => req('GET', '/loads'),
    create: (b) => req('POST', '/loads', b),
    update: (id, b) => req('PUT', `/loads/${id}`, b),
    delete: (id) => req('DELETE', `/loads/${id}`),
  },
  vehicles: {
    list: () => req('GET', '/vehicles'),
    create: (b) => req('POST', '/vehicles', b),
    update: (id, b) => req('PUT', `/vehicles/${id}`, b),
    delete: (id) => req('DELETE', `/vehicles/${id}`),
  },
  fuelEntries: {
    list: () => req('GET', '/fuel-entries'),
    create: (b) => req('POST', '/fuel-entries', b),
    update: (id, b) => req('PUT', `/fuel-entries/${id}`, b),
    delete: (id) => req('DELETE', `/fuel-entries/${id}`),
  },
  income: {
    list: () => req('GET', '/income'),
    create: (b) => req('POST', '/income', b),
    update: (id, b) => req('PUT', `/income/${id}`, b),
    delete: (id) => req('DELETE', `/income/${id}`),
  },
  expenses: {
    list: () => req('GET', '/expenses'),
    create: (b) => req('POST', '/expenses', b),
    update: (id, b) => req('PUT', `/expenses/${id}`, b),
    delete: (id) => req('DELETE', `/expenses/${id}`),
  },
};
