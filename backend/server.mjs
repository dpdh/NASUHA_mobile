import http from 'node:http';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = process.env.DATA_FILE || join(dirname(new URL(import.meta.url).pathname), 'data.json');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_DEV_AUTH = !IS_PRODUCTION && process.env.ALLOW_DEV_AUTH === 'true';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1_000_000);
const ROLES = ['super_admin', 'admin', 'sahabat', 'calon_sahabat'];
const MEMBERSHIPS = ['free', 'membership', 'sahabat'];
const PRODUCT_STATUSES = ['pending', 'approved', 'rejected'];
const EVENT_STATUSES = ['draft', 'published', 'cancelled'];

const now = () => new Date().toISOString();
const id = () => randomUUID();
const json = (value) => JSON.stringify(value, null, 2);

const defaultData = () => ({ users: [], products: [], events: [], registrations: [] });

async function loadData() {
  try {
    return { ...defaultData(), ...JSON.parse(await readFile(DATA_FILE, 'utf8')) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const data = defaultData();
    await saveData(data);
    return data;
  }
}

let dataPromise = loadData();
async function getData() { return dataPromise; }
async function saveData(data) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.tmp`;
  await writeFile(temporaryFile, json(data), 'utf8');
  await rename(temporaryFile, DATA_FILE);
}
let writeQueue = Promise.resolve();
async function updateData(mutator) {
  const operation = writeQueue.then(async () => {
    const data = await getData();
    const result = await mutator(data);
    await saveData(data);
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

function send(response, status, body) {
  const origin = IS_PRODUCTION ? (process.env.ALLOWED_ORIGIN || 'null') : '*';
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'vary': 'Origin' });
  response.end(body === undefined ? undefined : json(body));
}
function fail(response, status, message) { send(response, status, { error: message }); }
function publicUser(user) {
  const { googleSubject, sessionToken, ...safeUser } = user;
  return safeUser;
}
function parseId(pathname, prefix) {
  return decodeURIComponent(pathname.slice(prefix.length).split('/')[0]);
}
async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Payload terlalu besar'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('Body harus berupa JSON yang valid'); }
}
function requireFields(payload, fields) {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  if (missing.length) throw new Error(`Field wajib: ${missing.join(', ')}`);
}
function validateEnum(value, values, field) {
  if (value !== undefined && !values.includes(value)) throw new Error(`${field} tidak valid`);
}
function isAdmin(user) { return user && (user.role === 'admin' || user.role === 'super_admin'); }

async function verifyGoogleToken(token) {
  if (IS_PRODUCTION && !process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID wajib di production');
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('Token Google tidak valid atau sudah kedaluwarsa');
  const profile = await response.json();
  if (!profile.sub || !profile.email) throw new Error('Profil Google tidak lengkap');
  if (process.env.GOOGLE_CLIENT_ID && profile.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('Token bukan untuk aplikasi ini');
  return profile;
}

async function currentUser(request) {
  const authorization = request.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return null;
  if (ALLOW_DEV_AUTH && token.startsWith('dev:')) {
    const data = await getData();
    return data.users.find((user) => user.id === token.slice(4) && user.isActive) || null;
  }
  const data = await getData();
  return data.users.find((user) => user.sessionToken === token && user.isActive) || null;
}
async function requireUser(request, response) {
  const user = await currentUser(request);
  if (!user) { fail(response, 401, 'Autentikasi diperlukan'); return null; }
  return user;
}
async function requireAdmin(request, response) {
  const user = await requireUser(request, response);
  if (user && !isAdmin(user)) { fail(response, 403, 'Akses admin diperlukan'); return null; }
  return user;
}

async function googleLogin(request, response) {
  const token = (request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return fail(response, 401, 'Bearer token Google diperlukan');
  try {
    const profile = await verifyGoogleToken(token);
    const user = await updateData((data) => {
      const timestamp = now();
      const existing = data.users.find((candidate) => candidate.googleSubject === profile.sub || candidate.email === profile.email.toLowerCase());
      const updated = existing || {
        id: id(), email: profile.email.toLowerCase(), name: profile.name || profile.email.split('@')[0],
        role: 'calon_sahabat', membershipType: 'free', membershipFeatures: {}, isActive: true, createdAt: timestamp,
      };
      Object.assign(updated, { googleSubject: profile.sub, sessionToken: id(), email: profile.email.toLowerCase(), name: profile.name || updated.name, avatar: profile.picture || updated.avatar, authProvider: 'google', updatedAt: timestamp });
      if (!existing) data.users.push(updated);
      return updated;
    });
    return send(response, 200, { user: publicUser(user), token: IS_PRODUCTION ? user.sessionToken : `dev:${user.id}` });
  } catch (error) { return fail(response, 401, error.message); }
}

async function handleUsers(request, response, pathname, query) {
  const admin = await requireAdmin(request, response);
  if (!admin) return;
  const data = await getData();
  if (request.method === 'GET' && pathname === '/api/users') {
    const search = (query.get('search') || '').toLowerCase();
    const users = data.users.filter((user) => !search || user.name.toLowerCase().includes(search) || user.email.includes(search)).map(publicUser);
    return send(response, 200, { users });
  }
  const userId = parseId(pathname, '/api/users/');
  const target = data.users.find((user) => user.id === userId);
  if (!target) return fail(response, 404, 'User tidak ditemukan');
  if (request.method === 'DELETE') {
    if (target.id === admin.id) return fail(response, 400, 'Admin tidak dapat menghapus dirinya sendiri');
    await updateData((current) => { current.users = current.users.filter((user) => user.id !== userId); return null; });
    return send(response, 204);
  }
  if (request.method !== 'PATCH') return fail(response, 405, 'Method tidak didukung');
  try {
    const payload = await body(request);
    validateEnum(payload.role, ROLES, 'role');
    validateEnum(payload.membershipType, MEMBERSHIPS, 'membershipType');
    if (payload.role !== undefined && admin.role !== 'super_admin') return fail(response, 403, 'Hanya super admin yang dapat mengubah role');
    if (payload.isActive !== undefined && typeof payload.isActive !== 'boolean') throw new Error('isActive harus berupa boolean');
    if (payload.membershipFeatures !== undefined && (!payload.membershipFeatures || typeof payload.membershipFeatures !== 'object' || Array.isArray(payload.membershipFeatures) || Object.values(payload.membershipFeatures).some((value) => typeof value !== 'boolean'))) {
      throw new Error('membershipFeatures harus berupa object boolean');
    }
    if (target.role === 'super_admin' && admin.role !== 'super_admin') return fail(response, 403, 'Hanya super admin yang dapat mengubah super admin');
    const updated = await updateData((current) => {
      const item = current.users.find((user) => user.id === userId);
      if (payload.role !== undefined) item.role = payload.role;
      if (payload.isActive !== undefined) item.isActive = Boolean(payload.isActive);
      if (payload.membershipType !== undefined) item.membershipType = payload.membershipType;
      if (payload.membershipFeatures !== undefined) item.membershipFeatures = payload.membershipFeatures;
      item.updatedAt = now();
      return item;
    });
    return send(response, 200, { user: publicUser(updated) });
  } catch (error) { return fail(response, 400, error.message); }
}

function normalizeProduct(payload, existing = {}) {
  requireFields(payload, ['name', 'category', 'description', 'price', 'sellerWhatsapp']);
  if (!Number.isFinite(Number(payload.price)) || Number(payload.price) <= 0) throw new Error('price harus berupa angka positif');
  if (payload.photos !== undefined && !Array.isArray(payload.photos)) throw new Error('photos harus berupa array');
  return { ...existing, name: String(payload.name).trim(), category: String(payload.category).trim(), description: String(payload.description).trim(), price: Number(payload.price), photos: payload.photos || existing.photos || [], sellerWhatsapp: String(payload.sellerWhatsapp).trim(), sellerCity: payload.sellerCity || existing.sellerCity || '', specs: payload.specs || existing.specs || {}, tags: Array.isArray(payload.tags) ? payload.tags : existing.tags || [] };
}
async function handleProducts(request, response, pathname, query) {
  const data = await getData();
  if (request.method === 'GET' && pathname === '/api/lapak/products') {
    const user = await currentUser(request);
    const includeAll = user && isAdmin(user);
    const status = query.get('status');
    const products = data.products.filter((product) => (includeAll || product.status === 'approved') && (!status || product.status === status));
    return send(response, 200, { products });
  }
  const user = await requireUser(request, response);
  if (!user) return;
  if (request.method === 'POST' && pathname === '/api/lapak/products') {
    try {
      const product = normalizeProduct(await body(request));
      const timestamp = now();
      const created = { id: id(), sellerId: user.id, sellerName: user.name, ...product, status: 'pending', rating: 0, sold: 0, createdAt: timestamp, updatedAt: timestamp };
      await updateData((current) => { current.products.push(created); return null; });
      return send(response, 201, { product: created });
    } catch (error) { return fail(response, 400, error.message); }
  }
  const productId = parseId(pathname, '/api/lapak/products/');
  const target = data.products.find((product) => product.id === productId);
  if (!target) return fail(response, 404, 'Produk tidak ditemukan');
  if (request.method === 'DELETE') {
    if (!isAdmin(user) && target.sellerId !== user.id) return fail(response, 403, 'Bukan pemilik produk');
    await updateData((current) => { current.products = current.products.filter((product) => product.id !== productId); return null; });
    return send(response, 204);
  }
  if (request.method !== 'PATCH') return fail(response, 405, 'Method tidak didukung');
  try {
    const payload = await body(request);
    if (payload.status !== undefined) { if (!isAdmin(user)) return fail(response, 403, 'Hanya admin yang dapat memoderasi produk'); validateEnum(payload.status, PRODUCT_STATUSES, 'status'); }
    if (!isAdmin(user) && target.sellerId !== user.id) return fail(response, 403, 'Bukan pemilik produk');
    const updated = await updateData((current) => { const item = current.products.find((product) => product.id === productId); Object.assign(item, normalizeProduct({ ...item, ...payload }, item)); if (isAdmin(user) && payload.status) item.status = payload.status; item.updatedAt = now(); return item; });
    return send(response, 200, { product: updated });
  } catch (error) { return fail(response, 400, error.message); }
}

function normalizeEvent(payload, existing = {}) {
  requireFields(payload, ['title', 'type', 'date', 'time', 'location', 'quota']);
  if (!Number.isInteger(Number(payload.quota)) || Number(payload.quota) < 1) throw new Error('quota harus berupa bilangan positif');
  validateEnum(payload.status, EVENT_STATUSES, 'status');
  return { ...existing, title: String(payload.title).trim(), type: String(payload.type).trim(), date: String(payload.date), time: String(payload.time), location: String(payload.location).trim(), description: String(payload.description || existing.description || ''), quota: Number(payload.quota), contactWhatsapp: payload.contactWhatsapp || existing.contactWhatsapp || '', image: payload.image || existing.image };
}
async function handleEvents(request, response, pathname, query) {
  const data = await getData();
  if (request.method === 'GET' && pathname === '/api/events') {
    const user = await currentUser(request);
    const includeAll = user && isAdmin(user);
    const status = query.get('status');
    const events = data.events.filter((event) => (includeAll || (event.status || 'published') === 'published') && (!status || event.status === status));
    return send(response, 200, { events });
  }
  const user = await requireAdmin(request, response);
  if (!user) return;
  if (request.method === 'POST' && pathname === '/api/events') {
    try {
      const payload = await body(request);
      const timestamp = now();
      const event = { id: Date.now(), ...normalizeEvent(payload), registered: 0, status: payload.status || 'draft', createdBy: user.id, createdAt: timestamp, updatedAt: timestamp };
      await updateData((current) => { current.events.push(event); return null; });
      return send(response, 201, { event });
    } catch (error) { return fail(response, 400, error.message); }
  }
  const eventId = Number(parseId(pathname, '/api/events/'));
  const target = data.events.find((event) => event.id === eventId);
  if (!target) return fail(response, 404, 'Event tidak ditemukan');
  if (request.method === 'DELETE') {
    await updateData((current) => { current.events = current.events.filter((event) => event.id !== eventId); current.registrations = current.registrations.filter((registration) => registration.eventId !== eventId); return null; });
    return send(response, 204);
  }
  if (request.method !== 'PATCH') return fail(response, 405, 'Method tidak didukung');
  try {
    const payload = await body(request);
    const updated = await updateData((current) => { const item = current.events.find((event) => event.id === eventId); Object.assign(item, normalizeEvent({ ...item, ...payload }, item), payload.status ? { status: payload.status } : {}); item.updatedAt = now(); return item; });
    return send(response, 200, { event: updated });
  } catch (error) { return fail(response, 400, error.message); }
}

async function handleRegistrations(request, response, pathname) {
  const user = await requireUser(request, response);
  if (!user) return;
  const data = await getData();
  if (request.method === 'GET' && pathname === '/api/event-registrations') {
    const registrations = isAdmin(user) ? data.registrations : data.registrations.filter((registration) => registration.userId === user.id);
    return send(response, 200, { registrations });
  }
  if (request.method === 'POST' && pathname === '/api/event-registrations') {
    try {
      const payload = await body(request); requireFields(payload, ['eventId', 'userPhone']);
      const event = data.events.find((candidate) => candidate.id === Number(payload.eventId));
      if (!event || event.status !== 'published') return fail(response, 404, 'Event tidak tersedia');
      const existing = data.registrations.find((registration) => registration.eventId === event.id && registration.userId === user.id && registration.status !== 'cancelled');
      if (existing) return fail(response, 409, 'Anda sudah terdaftar pada event ini');
      const activeCount = data.registrations.filter((registration) => registration.eventId === event.id && registration.status !== 'cancelled').length;
      if (activeCount >= event.quota) return fail(response, 409, 'Kuota event sudah penuh');
      const registration = { id: id(), eventId: event.id, userId: user.id, userName: user.name, userEmail: user.email, userPhone: String(payload.userPhone), userCity: payload.userCity || '', notes: payload.notes || '', status: 'registered', createdAt: now() };
      await updateData((current) => { current.registrations.push(registration); const item = current.events.find((candidate) => candidate.id === event.id); item.registered = current.registrations.filter((candidate) => candidate.eventId === event.id && candidate.status !== 'cancelled').length; return null; });
      return send(response, 201, { registration });
    } catch (error) { return fail(response, 400, error.message); }
  }
  const registrationId = parseId(pathname, '/api/event-registrations/');
  const registration = data.registrations.find((candidate) => candidate.id === registrationId);
  if (!registration) return fail(response, 404, 'Pendaftaran tidak ditemukan');
  if (request.method !== 'PATCH') return fail(response, 405, 'Method tidak didukung');
  if (!isAdmin(user) && registration.userId !== user.id) return fail(response, 403, 'Bukan pendaftaran Anda');
  const payload = await body(request);
  validateEnum(payload.status, ['registered', 'confirmed', 'cancelled'], 'status');
  if (!isAdmin(user) && payload.status !== 'cancelled') return fail(response, 403, 'User hanya dapat membatalkan pendaftaran');
  const updated = await updateData((current) => { const item = current.registrations.find((candidate) => candidate.id === registrationId); item.status = payload.status; const event = current.events.find((candidate) => candidate.id === item.eventId); if (event) event.registered = current.registrations.filter((candidate) => candidate.eventId === item.eventId && candidate.status !== 'cancelled').length; return item; });
  return send(response, 200, { registration: updated });
}

async function route(request, response) {
  if (request.method === 'OPTIONS') return send(response, 204);
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (request.method === 'POST' && url.pathname === '/auth/google') return googleLogin(request, response);
    if (url.pathname.startsWith('/api/users')) return handleUsers(request, response, url.pathname, url.searchParams);
    if (url.pathname.startsWith('/api/lapak/products')) return handleProducts(request, response, url.pathname, url.searchParams);
    if (url.pathname.startsWith('/api/events')) return handleEvents(request, response, url.pathname, url.searchParams);
    if (url.pathname.startsWith('/api/event-registrations')) return handleRegistrations(request, response, url.pathname);
    if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { status: 'ok', service: 'nasjak-backend', time: now() });
    return fail(response, 404, 'Route tidak ditemukan');
  } catch (error) { console.error(error); return fail(response, error.status || 500, error.status ? error.message : 'Kesalahan internal server'); }
}

const server = http.createServer(route);
server.listen(PORT, () => console.log(`NASJAK backend listening on http://localhost:${PORT}`));
