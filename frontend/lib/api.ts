// @/lib/api.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Helper fetch con manejo simple de JSON/204
async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    cache: 'no-store',
  });

  if (res.status === 204) return true; // DELETE / 204

  let body: any = {};
  try { body = await res.json(); } catch { body = {}; }

  if (!res.ok || body.ok === false) {
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  return body.data ?? body; // soporta {ok:true,data} y retorno directo
}

export const api = {
  users: { list: () => req('/users') },

  login: (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  patients: {
    list: () => req('/patients'),
    get: (id: string | number) => req(`/patients/${id}`),
    create: (data: any) =>
      req('/patients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) =>
      req(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string | number) =>
      req(`/patients/${id}`, { method: 'DELETE' }),
  },

  doctors: {
    list: () => req('/doctors'),
    get: (id: string | number) => req(`/doctors/${id}`),
    create: (data: any) =>
      req('/doctors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) =>
      req(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string | number) =>
      req(`/doctors/${id}`, { method: 'DELETE' }),
  },

  appointments: {
    list: () => req('/appointments'),
    get: (id: string | number) => req(`/appointments/${id}`),
    create: (data: any) =>
      req('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) =>
      req(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string | number) =>
      req(`/appointments/${id}`, { method: 'DELETE' }),
  },

  records: { list: () => req('/records') },
  imaging: { list: () => req('/imaging') },
  services: { list: () => req('/services') },
  invoices: { list: () => req('/billing/invoices') },
  stats: { overview: () => req('/stats/overview') },
};
