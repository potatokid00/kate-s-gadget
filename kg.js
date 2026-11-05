/*!
 * Kate's Original Gadgets - shared frontend core (kg.js)
 * ---------------------------------------------------------------
 * Frontend-only demo layer: localStorage + sessionStorage, no backend.
 * Every page loads this file so auth, cart, orders, transactions and
 * permissions live in ONE place instead of being copied per page.
 *
 * NOTE: frontend-only authentication and role checks are suitable for a
 * demonstration but are NOT production security: anyone with browser
 * dev-tools can edit localStorage. All payments are SIMULATED.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ constants */
  var KEYS = {
    users: 'kate_users', catalog: 'kate_catalog', carts: 'kate_carts', wishlists: 'kate_wishlists',
    orders: 'kate_orders', txns: 'kate_transactions', inquiries: 'kate_inquiries',
    store: 'kate_selected_store', session: 'kate_session', schema: 'kate_schema'
  };
  var SCHEMA_VERSION = '2';
  var ADMIN_ID = 'admin-kate';
  var ADMIN_EMAIL = 'kate@katesgadgets.ph';           // designated administrator account
  var ADMIN_SEED = {                                    // salted+iterated SHA-256, never plaintext
    salt: '4b1d9c7e2a6f4803b5d1e97a3c0f8d26',
    hash: 'f87548cab3f39467cf221317c74c0b7a1dcddba7059d9ec5bc898b97a5d5a6c2'
  };
  var HASH_ITER = 20000;
  var SHIPPING_FEE = 150;
  var STAGES = ['Order Placed', 'Payment Confirmed', 'Preparing Order', 'Shipped', 'Out for Delivery', 'Delivered'];
  var PAY_STATUSES = ['Pending', 'Processing', 'Paid', 'Failed', 'Refunded'];
  var PAY_TRANSITIONS = { Pending: ['Processing', 'Paid', 'Failed'], Processing: ['Pending', 'Paid', 'Failed'], Paid: ['Refunded'], Failed: [], Refunded: [] };
  var PAY_METHODS = {
    'e-wallet': 'GCash / Maya (simulated)',
    'card': 'Credit / Debit Card (simulated)',
    'bank': 'Bank Transfer (simulated)',
    'cod': 'COD / Store Pay (pay on receipt)'
  };
  var CATEGORY_IDS = ['smartphones', 'smartwatches', 'audio', 'tablets', 'accessories'];
  var CONDITIONS = ['Brand New', 'Grade A \u2013 Like New', 'Grade B \u2013 Good', 'Grade C \u2013 Fair'];
  // What each condition means to the customer (edit the wording here to match your store policy)
  var CONDITION_INFO = {
    'Brand New': { kind: 'new', desc: 'Brand new and unused.' },
    'Grade A \u2013 Like New': { kind: 'preowned', desc: 'Pre-owned with little to no signs of use.' },
    'Grade B \u2013 Good': { kind: 'preowned', desc: 'Pre-owned with light, visible signs of use such as minor scratches.' },
    'Grade C \u2013 Fair': { kind: 'preowned', desc: 'Pre-owned with noticeable cosmetic wear.' }
  };
  function conditionKind(c) { return CONDITION_INFO[c] ? CONDITION_INFO[c].kind : (c === 'Brand New' ? 'new' : 'preowned'); }
  function conditionDesc(c) { return CONDITION_INFO[c] ? CONDITION_INFO[c].desc : (conditionKind(c) === 'new' ? 'Brand new and unused.' : 'Pre-owned.'); }

  const STORES = [
              {
                  id: 'delivery',
                  name: 'Standard Home Delivery',
                  region: 'Delivery',
                  address: 'Doorstep shipping via LBC / J&T Express',
                  hours: '2-5 Business Days',
                  phone: '1-800-KATE-GADGETS',
                  isDelivery: true,
                  badge: 'NATIONWIDE',
                  pickupTime: '2-5 Days'
              },
              {
                  id: 'greenhills',
                  name: 'Kate\'s Greenhills Flagship',
                  region: 'Metro Manila',
                  address: '2nd Floor, V-Mall, Greenhills Shopping Center, San Juan City',
                  hours: '10:00 AM - 8:00 PM Daily',
                  phone: '(02) 8721-9842',
                  isDelivery: false,
                  badge: 'MAIN HUB',
                  pickupTime: 'Ready in 2 Hours'
              },
              {
                  id: 'megamall',
                  name: 'Kate\'s SM Megamall Cyberzone',
                  region: 'Metro Manila',
                  address: '4th Floor, Cyberzone, Building B, SM Megamall, Mandaluyong City',
                  hours: '10:00 AM - 10:00 PM Daily',
                  phone: '(02) 8633-1120',
                  isDelivery: false,
                  badge: 'CYBERZONE',
                  pickupTime: 'Ready in 2 Hours'
              },
              {
                  id: 'moa',
                  name: 'Kate\'s SM Mall of Asia Store',
                  region: 'Metro Manila',
                  address: '2nd Level, North Parking Building, SM Mall of Asia, Pasay City',
                  hours: '10:00 AM - 10:00 PM Daily',
                  phone: '(02) 8556-0210',
                  isDelivery: false,
                  badge: 'POPULAR',
                  pickupTime: 'Ready in 3 Hours'
              },
              {
                  id: 'sm-lanang',
                  name: 'Kate\'s SM Lanang Premier Branch',
                  region: 'Mindanao',
                  address: '3rd Floor Cyberzone, J.P. Laurel Ave, Lanang, Davao City',
                  hours: '10:00 AM - 9:00 PM Daily',
                  phone: '(082) 285-8888',
                  isDelivery: false,
                  badge: 'DAVAO CITY',
                  pickupTime: 'Ready in 1 Hour'
              },
              {
                  id: 'abreeza',
                  name: 'Kate\'s Abreeza Mall Branch',
                  region: 'Mindanao',
                  address: '3rd Floor, Tech Wing, Abreeza Mall, J.P. Laurel Ave, Davao City',
                  hours: '10:00 AM - 9:00 PM Daily',
                  phone: '(082) 321-4470',
                  isDelivery: false,
                  badge: 'DAVAO CITY',
                  pickupTime: 'Ready in 1 Hour'
              },
              {
                  id: 'sm-ecoland',
                  name: 'Kate\'s SM City Davao (Ecoland)',
                  region: 'Mindanao',
                  address: '2nd Floor Cyberzone, Quimpo Blvd, Ecoland, Davao City',
                  hours: '10:00 AM - 9:00 PM Daily',
                  phone: '(082) 297-7777',
                  isDelivery: false,
                  badge: 'DAVAO CITY',
                  pickupTime: 'Ready in 2 Hours'
              },
              {
                  id: 'cebu',
                  name: 'Kate\'s SM City Cebu Branch',
                  region: 'Visayas',
                  address: '2nd Floor, Cyberzone, SM City Cebu, North Reclamation Area',
                  hours: '10:00 AM - 9:00 PM Daily',
                  phone: '(032) 231-5589',
                  isDelivery: false,
                  badge: 'VISAYAS HUB',
                  pickupTime: 'Ready in 2 Hours'
              }
          ];

  var SEED_PRODUCTS = [
    { id: 1, name: 'iPhone 16 (Pre-Owned)', category: 'smartphones', price: 45990, originalPrice: 49990, rating: 4.9, reviewsCount: 128, image: 'iphone16.webp', condition: 'Grade A \u2013 Like New', stock: 4, badge: 'PRE-OWNED', description: 'Pre-owned iPhone 16 in excellent condition, store-tested with warranty.', specs: 'Storage: 128GB\nBattery health: 94%\nUnlocked: Yes' },
    { id: 2, name: '2025 Apple Watch SE Sport Band (3rd Gen - Starlight)', category: 'smartwatches', price: 15490, originalPrice: 17990, rating: 4.8, reviewsCount: 184, image: 'watchse3.webp', condition: 'Brand New', stock: 9, badge: 'POPULAR', description: 'Apple Watch SE with Sport Band in Starlight.', specs: 'Case: 44mm\nConnectivity: GPS' },
    { id: 3, name: 'AirPods Max (USB-C - Midnight)', category: 'audio', price: 32990, originalPrice: 35990, rating: 4.9, reviewsCount: 156, image: 'airpodmax2.webp', condition: 'Brand New', stock: 3, badge: 'NEW', description: 'Over-ear headphones with Active Noise Cancellation.', specs: 'Port: USB-C\nColor: Midnight' },
    { id: 4, name: '20W USB-C Power Adapter', category: 'accessories', price: 990, originalPrice: 1290, rating: 4.8, reviewsCount: 230, image: '20wusbc.webp', condition: 'Brand New', stock: 40, badge: 'SALE', description: 'Fast, efficient charging at home or on the go.', specs: 'Output: 20W\nPort: USB-C' },
    { id: 5, name: '13-inch iPad Pro M5 (256GB Space Black)', category: 'tablets', price: 109990, originalPrice: 114990, rating: 4.9, reviewsCount: 88, image: 'ipadprom5.webp', condition: 'Brand New', stock: 2, badge: 'FEATURED', description: 'The thinnest iPad with the M5 chip.', specs: 'Chip: M5\nStorage: 256GB\nDisplay: 13-inch' },
    { id: 6, name: 'AirPods Pro 3', category: 'audio', price: 14290, originalPrice: 16990, rating: 4.9, reviewsCount: 142, image: 'airpodpro3.webp', condition: 'Brand New', stock: 0, badge: 'SALE', description: 'Next-gen ANC with a better fit.', specs: 'ANC: Yes\nCase: USB-C' }
  ];

  /* ------------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function peso(n) {
    return '\u20B1' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtDateTime(iso) {
    if (!iso) return '\u2014';
    var d = new Date(iso);
    if (isNaN(d)) return '\u2014';
    return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function fmtDate(iso) {
    if (!iso) return '\u2014';
    var d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00') : new Date(iso);
    if (isNaN(d)) return '\u2014';
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function nowISO() { return new Date().toISOString(); }
  function same(a, b) { return String(a) === String(b); }
  function rand(len, alphabet) {
    var out = '', buf = new Uint32Array(len);
    (global.crypto || {}).getRandomValues ? global.crypto.getRandomValues(buf) : buf.forEach(function (_, i) { buf[i] = Math.floor(Math.random() * 4294967296); });
    for (var i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
    return out;
  }

  /* ------------------------------------------------------------------ safe storage */
  function area(name) { try { return global[name]; } catch (e) { return null; } }
  function read(key, fallback, which) {
    try {
      var raw = (area(which || 'localStorage')).getItem(key);
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value, which) {
    try { (area(which || 'localStorage')).setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function readArr(key) { var v = read(key, []); return Array.isArray(v) ? v : []; }
  function readObj(key) { var v = read(key, {}); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
  function rawGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function rawSet(key, raw) { try { if (raw == null) localStorage.removeItem(key); else localStorage.setItem(key, raw); return true; } catch (e) { return false; } }

  function emit() { try { global.dispatchEvent(new CustomEvent('kg:change')); } catch (e) {} }
  global.addEventListener && global.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('kate_') === 0) { try { global.dispatchEvent(new CustomEvent('kg:change')); } catch (err) {} }
  });

  /* ------------------------------------------------------------------ password hashing (pure JS, works on http/file/https) */
  var K256 = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  function sha256(bytes) {
    var l = bytes.length, bitLenHi = Math.floor(l / 0x20000000), bitLenLo = (l << 3) >>> 0;
    var total = (((l + 9 + 63) >> 6) << 6);
    var m = new Uint8Array(total);
    m.set(bytes); m[l] = 0x80;
    m[total - 8] = bitLenHi >>> 24; m[total - 7] = bitLenHi >>> 16; m[total - 6] = bitLenHi >>> 8; m[total - 5] = bitLenHi;
    m[total - 4] = bitLenLo >>> 24; m[total - 3] = bitLenLo >>> 16; m[total - 2] = bitLenLo >>> 8; m[total - 1] = bitLenLo;
    var H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    var w = new Uint32Array(64);
    for (var off = 0; off < total; off += 64) {
      for (var i = 0; i < 16; i++) w[i] = (m[off + i * 4] << 24) | (m[off + i * 4 + 1] << 16) | (m[off + i * 4 + 2] << 8) | m[off + i * 4 + 3];
      for (i = 16; i < 64; i++) {
        var a15 = w[i - 15], a2 = w[i - 2];
        var s0 = ((a15 >>> 7) | (a15 << 25)) ^ ((a15 >>> 18) | (a15 << 14)) ^ (a15 >>> 3);
        var s1 = ((a2 >>> 17) | (a2 << 15)) ^ ((a2 >>> 19) | (a2 << 13)) ^ (a2 >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) { out[i * 4] = H[i] >>> 24; out[i * 4 + 1] = H[i] >>> 16; out[i * 4 + 2] = H[i] >>> 8; out[i * 4 + 3] = H[i]; }
    return out;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function concat(a, b) { var o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; }
  function toHex(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; }
  function hashPassword(salt, pw) {
    var h = sha256(utf8(salt + ':' + pw)), extra = utf8(salt + pw);
    for (var i = 0; i < HASH_ITER; i++) h = sha256(concat(h, extra));
    return toHex(h);
  }
  function sha256hex(str) { return toHex(sha256(utf8(str))); }
  function safeEqual(a, b) { if (a.length !== b.length) return false; var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

  /* ------------------------------------------------------------------ users & auth */
  function getUsers() { return readArr(KEYS.users).filter(function (u) { return u && u.id && u.email; }); }
  function saveUsers(list) { return write(KEYS.users, list); }
  function publicUser(u) {
    return u ? { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone || '', address: u.address || '', createdAt: u.createdAt || null } : null;
  }
  function sessionProof(nonce, u) { return sha256hex(nonce + ':' + u.id + ':' + u.hash); }
  function currentUser() {
    var s = read(KEYS.session, null, 'sessionStorage');
    if (!s || !s.userId) return null;
    var u = getUsers().filter(function (x) { return x.id === s.userId; })[0];
    // the session must carry a proof bound to this account's password hash, so merely typing a user id into sessionStorage is not enough
    if (!u || !s.nonce || !s.proof || !safeEqual(sessionProof(s.nonce, u), String(s.proof))) { try { sessionStorage.removeItem(KEYS.session); } catch (e) {} return null; }
    return publicUser(u);     // role always comes from the stored user record, never from the session
  }
  function isAdmin(u) {
    u = (u === undefined) ? currentUser() : u;
    return !!(u && u.role === 'admin' && u.id === ADMIN_ID && u.email === ADMIN_EMAIL);
  }
  function requireAdmin() {
    if (!isAdmin()) throw new Error('Staff access only.');
  }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

  function ensureAdmin() {
    var users = getUsers(), changed = false;
    var admin = users.filter(function (u) { return u.id === ADMIN_ID; })[0];
    if (!admin) {
      users = users.filter(function (u) { return u.email !== ADMIN_EMAIL; });   // email is reserved
      users.push({ id: ADMIN_ID, name: 'Kate', email: ADMIN_EMAIL, role: 'admin', salt: ADMIN_SEED.salt, hash: ADMIN_SEED.hash, createdAt: nowISO() });
      changed = true;
    } else {
      if (admin.role !== 'admin') { admin.role = 'admin'; changed = true; }
      if (admin.email !== ADMIN_EMAIL) { admin.email = ADMIN_EMAIL; changed = true; }
    }
    users.forEach(function (u) { if (u.id !== ADMIN_ID && u.role !== 'customer') { u.role = 'customer'; changed = true; } });  // only ONE admin exists
    if (changed) saveUsers(users);
  }

  function register(input) {
    var name = String(input.name || '').trim(), email = String(input.email || '').trim().toLowerCase(), pw = String(input.password || '');
    if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
    if (!validEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
    if (pw.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (email === ADMIN_EMAIL) return { ok: false, error: 'That email address is reserved.' };
    var users = getUsers();
    if (users.some(function (u) { return u.email === email; })) return { ok: false, error: 'An account with that email already exists. Please sign in.' };
    var salt = rand(32, '0123456789abcdef');
    var user = { id: 'u-' + Date.now().toString(36) + rand(5, 'abcdefghijklmnopqrstuvwxyz0123456789'), name: name, email: email,
      role: 'customer', phone: '', address: '', salt: salt, hash: hashPassword(salt, pw), createdAt: nowISO() };   // role is ALWAYS customer
    users.push(user);
    if (!saveUsers(users)) return { ok: false, error: 'Could not save your account (browser storage is full or blocked).' };
    startSession(user);
    return { ok: true, user: publicUser(user) };
  }
  function login(email, pw) {
    email = String(email || '').trim().toLowerCase(); pw = String(pw || '');
    var u = getUsers().filter(function (x) { return x.email === email; })[0];
    if (!u || !u.salt || !u.hash || !safeEqual(hashPassword(u.salt, pw), u.hash)) return { ok: false, error: 'Incorrect email or password.' };
    startSession(u);
    return { ok: true, user: publicUser(u) };
  }
  function startSession(u) {
    try { sessionStorage.removeItem(KEYS.session); } catch (e) {}       // never inherit a previous session
    var nonce = rand(24, '0123456789abcdef');
    write(KEYS.session, { userId: u.id, at: nowISO(), nonce: nonce, proof: sessionProof(nonce, u) }, 'sessionStorage');
    if (u.role !== 'admin') mergeGuestData(u.id);
    emit();
  }
  function logout() {
    try { sessionStorage.removeItem(KEYS.session); } catch (e) {}
    try { localStorage.removeItem('kate_user'); } catch (e) {}           // legacy key
    emit();
  }
  function updateProfile(patch) {
    var me = currentUser(); if (!me) return { ok: false, error: 'Please sign in.' };
    var name = String(patch.name || '').trim();
    if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
    var users = getUsers(), u = users.filter(function (x) { return x.id === me.id; })[0];
    u.name = name; u.phone = String(patch.phone || '').trim(); u.address = String(patch.address || '').trim();
    if (!saveUsers(users)) return { ok: false, error: 'Could not save (storage full).' };
    emit(); return { ok: true };
  }
  function changePassword(oldPw, newPw) {
    var me = currentUser(); if (!me) return { ok: false, error: 'Please sign in.' };
    if (String(newPw || '').length < 6) return { ok: false, error: 'New password must be at least 6 characters.' };
    var users = getUsers(), u = users.filter(function (x) { return x.id === me.id; })[0];
    if (!safeEqual(hashPassword(u.salt, String(oldPw || '')), u.hash)) return { ok: false, error: 'Current password is incorrect.' };
    u.salt = rand(32, '0123456789abcdef'); u.hash = hashPassword(u.salt, newPw);
    if (!saveUsers(users)) return { ok: false, error: 'Could not save (storage full).' };
    startSession(u);
    return { ok: true };
  }
  function customers() {            // staff only; never exposes password data
    requireAdmin();
    return getUsers().filter(function (u) { return u.role === 'customer'; }).map(publicUser);
  }

  /* ------------------------------------------------------------------ catalog (single source of truth) */
  function normProduct(p) {
    var n = {
      id: Number(p.id), sku: p.sku || ('KOG-' + String(p.id).padStart(3, '0')), name: String(p.name || 'Untitled'),
      category: CATEGORY_IDS.indexOf(p.category) > -1 ? p.category : 'accessories',
      price: Math.max(0, Number(p.price) || 0), originalPrice: Math.max(0, Number(p.originalPrice) || 0),
      rating: Number(p.rating) || 5, reviewsCount: Number(p.reviewsCount) || 0, image: p.image || 'kate1.avif',
      condition: p.condition || CONDITIONS[0], stock: Math.max(0, Math.floor(Number(p.stock) || 0)), lowAt: Math.max(0, Number(p.lowAt == null ? 3 : p.lowAt)),
      status: p.status === 'draft' ? 'draft' : 'published', badge: p.badge || '', description: p.description || '', specs: p.specs || ''
    };
    return n;
  }
  function catalogAll() {
    var raw = read(KEYS.catalog, null);
    if (!Array.isArray(raw)) {
      raw = SEED_PRODUCTS.map(function (p) { return Object.assign({ lowAt: 3, status: 'published' }, p); });
      write(KEYS.catalog, raw);
    }
    return raw.filter(function (p) { return p && p.id != null; }).map(normProduct);
  }
  function catalogPublished() { return catalogAll().filter(function (p) { return p.status !== 'draft'; }); }
  function catalogGet(id) { return catalogAll().filter(function (p) { return same(p.id, id); })[0] || null; }
  function catalogSave(list) { return write(KEYS.catalog, list); }
  var catalog = {
    all: catalogAll, published: catalogPublished, get: catalogGet,
    upsert: function (data) {            // staff only
      requireAdmin();
      var list = catalogAll(), name = String(data.name || '').trim(), price = Number(data.price);
      if (!name || !(price > 0)) return { ok: false, error: 'Name and a price greater than 0 are required.' };
      var d = { name: name, category: data.category, condition: data.condition, price: price, originalPrice: Number(data.originalPrice) || 0,
        stock: Math.max(0, Math.floor(Number(data.stock) || 0)), status: data.status === 'draft' ? 'draft' : 'published', badge: String(data.badge || '').trim(),
        description: String(data.description || '').trim(), specs: String(data.specs || '').trim(), image: data.image || 'kate1.avif' };
      var saved;
      if (data.id) {
        var p = list.filter(function (x) { return same(x.id, data.id); })[0];
        if (!p) return { ok: false, error: 'Product not found.' };
        Object.assign(p, d); saved = p;
      } else {
        var nid = Math.max(0, Math.max.apply(null, list.map(function (x) { return x.id; }).concat([0]))) + 1;
        saved = Object.assign({ id: nid, sku: 'KOG-' + String(nid).padStart(3, '0'), lowAt: 3, rating: 5, reviewsCount: 0 }, d);
        list.push(saved);
      }
      if (!catalogSave(list)) return { ok: false, error: 'Storage full \u2013 try a smaller photo.' };
      emit(); return { ok: true, product: saved };
    },
    remove: function (id) {
      requireAdmin();
      var list = catalogAll(); catalogSave(list.filter(function (p) { return !same(p.id, id); })); emit(); return { ok: true };
    },
    patch: function (id, patch) {         // staff: inventory edits (stock, lowAt, condition)
      requireAdmin();
      var list = catalogAll(), p = list.filter(function (x) { return same(x.id, id); })[0];
      if (!p) return { ok: false, error: 'Product not found.' };
      ['stock', 'lowAt'].forEach(function (k) { if (k in patch) p[k] = Math.max(0, Math.floor(Number(patch[k]) || 0)); });
      if ('condition' in patch && CONDITIONS.indexOf(patch.condition) > -1) p.condition = patch.condition;
      if (!catalogSave(list)) return { ok: false, error: 'Storage full.' };
      emit(); return { ok: true };
    }
  };

  /* ------------------------------------------------------------------ carts & wishlists (per account) */
  function ownerKey() { var u = currentUser(); return u ? u.id : 'guest'; }
  function canShop() { return !isAdmin(); }
  function readCartMap() { return readObj(KEYS.carts); }
  function getRawCart(owner) {
    var list = readCartMap()[owner || ownerKey()];
    if (!Array.isArray(list)) return [];
    var out = [];
    list.forEach(function (l) {
      var id = l && (l.id != null ? l.id : l.productId), q = Math.floor(Number(l && (l.qty != null ? l.qty : l.quantity)));
      if (id == null || !(q > 0)) return;
      var ex = out.filter(function (o) { return same(o.id, id); })[0];
      if (ex) ex.qty += q; else out.push({ id: Number(id), qty: q });
    });
    return out;
  }
  function setRawCart(list, owner) {
    var map = readCartMap(); map[owner || ownerKey()] = list;
    var ok = write(KEYS.carts, map); if (ok) emit(); return ok;
  }
  function mergeGuestData(userId) {
    var map = readCartMap(), guest = Array.isArray(map.guest) ? map.guest : [];
    if (guest.length) {
      var mine = getRawCart(userId);
      guest.forEach(function (g) {
        var id = Number(g.id != null ? g.id : g.productId), q = Math.floor(Number(g.qty != null ? g.qty : g.quantity)) || 0;
        if (!q) return;
        var p = catalogGet(id); if (!p || p.status === 'draft' || p.stock <= 0) return;
        var ex = mine.filter(function (m) { return same(m.id, id); })[0];
        if (ex) ex.qty = Math.min(p.stock, ex.qty + q); else mine.push({ id: id, qty: Math.min(p.stock, q) });
      });
      map[userId] = mine; delete map.guest; write(KEYS.carts, map);
    }
    var wm = readObj(KEYS.wishlists), gw = Array.isArray(wm.guest) ? wm.guest : [];
    if (gw.length) {
      var mw = Array.isArray(wm[userId]) ? wm[userId] : [];
      gw.forEach(function (id) { if (mw.indexOf(id) < 0) mw.push(id); });
      wm[userId] = mw; delete wm.guest; write(KEYS.wishlists, wm);
    }
  }
  function cartDetailed() {
    var lines = [], subtotal = 0, count = 0, issues = false;
    getRawCart().forEach(function (l) {
      var p = catalogGet(l.id), issue = '';
      if (!p || p.status === 'draft') issue = 'unavailable';
      else if (p.stock <= 0) issue = 'soldout';
      else if (l.qty > p.stock) issue = 'over';
      var price = p ? p.price : 0, sub = issue ? 0 : price * l.qty;
      if (issue) issues = true; else { subtotal += sub; }
      count += l.qty;
      lines.push({ id: l.id, name: p ? p.name : 'Unavailable product', image: p ? p.image : 'kate1.avif', condition: p ? p.condition : '', price: price, qty: l.qty, stock: p ? p.stock : 0, subtotal: sub, issue: issue });
    });
    return { lines: lines, subtotal: subtotal, count: count, hasIssues: issues };
  }
  var cart = {
    count: function () { return getRawCart().reduce(function (t, l) { return t + l.qty; }, 0); },
    detailed: cartDetailed,
    add: function (id, qty) {
      if (!canShop()) return { ok: false, error: 'Staff accounts cannot place orders.' };
      qty = Math.max(1, Math.floor(Number(qty) || 1));
      var p = catalogGet(id);
      if (!p || p.status === 'draft') return { ok: false, error: 'This product is no longer available.' };
      if (p.stock <= 0) return { ok: false, error: p.name + ' is sold out.' };
      var list = getRawCart(), ex = list.filter(function (l) { return same(l.id, p.id); })[0], cur = ex ? ex.qty : 0;
      if (cur + qty > p.stock) return { ok: false, error: cur >= p.stock ? 'You already have all ' + p.stock + ' available in your cart.' : 'Only ' + p.stock + ' in stock (you have ' + cur + ' in your cart).' };
      if (ex) ex.qty += qty; else list.push({ id: p.id, qty: qty });
      if (!setRawCart(list)) return { ok: false, error: 'Could not save your cart (storage full).' };
      return { ok: true, product: p, qty: cur + qty };
    },
    setQty: function (id, qty) {
      qty = Math.floor(Number(qty));
      var list = getRawCart(), l = list.filter(function (x) { return same(x.id, id); })[0];
      if (!l) return { ok: false, error: 'Item not in cart.' };
      if (!(qty > 0)) return cart.remove(id);
      var p = catalogGet(id);
      if (p && qty > p.stock) return { ok: false, error: 'Only ' + p.stock + ' in stock.' };
      l.qty = qty; setRawCart(list); return { ok: true };
    },
    change: function (id, delta) {
      var l = getRawCart().filter(function (x) { return same(x.id, id); })[0];
      return l ? cart.setQty(id, l.qty + delta) : { ok: false, error: 'Item not in cart.' };
    },
    remove: function (id) { setRawCart(getRawCart().filter(function (l) { return !same(l.id, id); })); return { ok: true }; },
    clear: function () { setRawCart([]); },
    reconcile: function () {          // drop unavailable items, clamp quantities; returns human-readable notes
      var notes = [], out = [];
      getRawCart().forEach(function (l) {
        var p = catalogGet(l.id);
        if (!p || p.status === 'draft') { notes.push('A product in your cart is no longer available and was removed.'); return; }
        if (p.stock <= 0) { notes.push(p.name + ' is sold out and was removed.'); return; }
        if (l.qty > p.stock) { notes.push(p.name + ' quantity reduced to ' + p.stock + ' (stock limit).'); l.qty = p.stock; }
        out.push(l);
      });
      if (notes.length) setRawCart(out);
      return notes;
    }
  };
  var wishlist = {
    ids: function () { var l = readObj(KEYS.wishlists)[ownerKey()]; return Array.isArray(l) ? l.map(Number) : []; },
    has: function (id) { return wishlist.ids().indexOf(Number(id)) > -1; },
    toggle: function (id) {
      id = Number(id);
      var map = readObj(KEYS.wishlists), k = ownerKey(), l = Array.isArray(map[k]) ? map[k].map(Number) : [], i = l.indexOf(id);
      if (i > -1) l.splice(i, 1); else l.push(id);
      map[k] = l; write(KEYS.wishlists, map); emit();
      return { ok: true, added: i < 0 };
    }
  };

  /* ------------------------------------------------------------------ orders & transactions */
  function normOrder(o) {
    if (!o || !o.id) return null;
    var legacyMap = { processing: 0, ready: 2, completed: 5 };
    var cancelled = o.cancelled || (o.status === 'cancelled' ? { at: o.createdAt || null, by: 'legacy', reason: '' } : null);
    var idx = typeof o.stageIndex === 'number' ? o.stageIndex : (o.status in legacyMap ? legacyMap[o.status] : 0);
    idx = Math.max(0, Math.min(STAGES.length - 1, idx));
    var items = (Array.isArray(o.items) ? o.items : []).map(function (i) {
      return { id: i.id != null ? i.id : i.productId, name: String(i.name || ''), price: Number(i.price) || 0, qty: Number(i.qty != null ? i.qty : i.quantity) || 1, image: i.image || '', condition: i.condition || '' };
    });
    var subtotal = o.subtotal != null ? Number(o.subtotal) : items.reduce(function (t, i) { return t + i.price * i.qty; }, 0);
    var ship = o.shippingFee != null ? Number(o.shippingFee) : (o.fulfillment === 'delivery' ? SHIPPING_FEE : 0);
    var pay = (o.payment && typeof o.payment === 'object') ? o.payment : { method: String(o.payment || ''), label: String(o.payment || '') };
    return {
      id: String(o.id), userId: o.userId || null, createdAt: o.createdAt || null,
      customer: Object.assign({ name: '', phone: '', email: '', address: '' }, o.customer || {}),
      items: items, subtotal: subtotal, shippingFee: ship, total: o.total != null ? Number(o.total) : subtotal + ship,
      fulfillment: o.fulfillment === 'delivery' ? 'delivery' : 'pickup', branch: o.branch || '', payment: pay, txnId: o.txnId || null,
      stageIndex: idx, stageHistory: Array.isArray(o.stageHistory) ? o.stageHistory : [{ stage: 0, label: STAGES[0], at: o.createdAt || null, by: 'system' }],
      estimatedDelivery: /^\d{4}-\d{2}-\d{2}$/.test(o.estimatedDelivery || '') ? o.estimatedDelivery : null,
      cancelled: cancelled, restocked: !!o.restocked, attemptId: o.attemptId || null
    };
  }
  function normTxn(t) {
    if (!t || !t.id) return null;
    return { id: String(t.id), orderId: t.orderId || null, userId: t.userId || null, amount: Number(t.amount) || 0, method: t.method || '', methodLabel: t.methodLabel || PAY_METHODS[t.method] || t.method || '',
      status: PAY_STATUSES.indexOf(t.status) > -1 ? t.status : 'Pending', simulated: true, createdAt: t.createdAt || null, history: Array.isArray(t.history) ? t.history : [] };
  }
  function allOrders() { return readArr(KEYS.orders).map(normOrder).filter(Boolean); }
  function allTxns() { return readArr(KEYS.txns).map(normTxn).filter(Boolean); }
  function byNewest(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }
  function orderStatus(o) { return o.cancelled ? 'Cancelled' : STAGES[o.stageIndex]; }
  function newId(prefix, existing, mk) { var id, n = 0; do { id = mk(); n++; } while (existing.indexOf(id) > -1 && n < 50); return id; }

  function snapshot() { return { o: rawGet(KEYS.orders), t: rawGet(KEYS.txns), c: rawGet(KEYS.catalog), k: rawGet(KEYS.carts) }; }
  function restore(s) { rawSet(KEYS.orders, s.o); rawSet(KEYS.txns, s.t); rawSet(KEYS.catalog, s.c); rawSet(KEYS.carts, s.k); }

  function restockOrder(order, catalogList) {
    if (order.restocked) return;
    order.items.forEach(function (i) { var p = catalogList.filter(function (x) { return same(x.id, i.id); })[0]; if (p) p.stock += i.qty; });
    order.restocked = true;
  }
  function pushTxn(t, status, by, note) { t.status = status; t.history.push({ status: status, at: nowISO(), by: by, note: note || '' }); }

  var orders = {
    place: function (input) {
      var me = currentUser();
      if (!me) return { ok: false, error: 'Please sign in to place an order.' };
      if (isAdmin(me)) return { ok: false, error: 'Staff accounts cannot place orders.' };
      var name = String(input.name || '').trim(), phone = String(input.phone || '').trim(), email = String(input.email || '').trim();
      var fulfillment = input.fulfillment === 'delivery' ? 'delivery' : 'pickup', address = String(input.address || '').trim();
      if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
      if (!/^[+\d][\d\s\-()]{6,}$/.test(phone)) return { ok: false, error: 'Please enter a valid mobile number.' };
      if (email && !validEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
      if (fulfillment === 'delivery' && address.length < 8) return { ok: false, error: 'Please enter your complete shipping address.' };
      if (!PAY_METHODS[input.paymentMethod]) return { ok: false, error: 'Please choose a payment method.' };
      var branch = 'Home Delivery';
      if (fulfillment === 'pickup') {
        var st = STORES.filter(function (s) { return s.id === input.branchId && !s.isDelivery; })[0];
        if (!st) return { ok: false, error: 'Please choose a pickup branch.' };
        branch = st.name;
      }
      var existing = allOrders();
      if (input.attemptId) {                                 // double-click / refresh protection
        var dup = existing.filter(function (o) { return o.attemptId === input.attemptId && o.userId === me.id; })[0];
        if (dup) return { ok: true, order: dup, duplicate: true };
      }
      var notes = cart.reconcile();
      if (notes.length) return { ok: false, error: 'Your cart changed: ' + notes.join(' ') };
      var d = cartDetailed();
      if (!d.lines.length) return { ok: false, error: 'Your cart is empty.' };

      var snap = snapshot();
      var catList = catalogAll();
      var items = [];
      for (var i = 0; i < d.lines.length; i++) {
        var l = d.lines[i], p = catList.filter(function (x) { return same(x.id, l.id); })[0];
        if (!p || p.stock < l.qty) return { ok: false, error: (p ? p.name : 'An item') + ' does not have enough stock.' };
        p.stock -= l.qty;
        items.push({ id: p.id, name: p.name, price: p.price, qty: l.qty, image: p.image, condition: p.condition });
      }
      var subtotal = items.reduce(function (t, x) { return t + x.price * x.qty; }, 0), shippingFee = fulfillment === 'delivery' ? SHIPPING_FEE : 0;
      var txns = allTxns(), at = nowISO();
      var orderId = newId('KOG', existing.map(function (o) { return o.id; }), function () { return 'KOG-' + rand(6, '0123456789'); });
      var txnId = newId('TXN', txns.map(function (t) { return t.id; }), function () { return 'TXN-' + at.slice(0, 10).replace(/-/g, '') + '-' + rand(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'); });
      var status = input.paymentMethod === 'cod' ? 'Pending' : 'Processing';
      var order = { id: orderId, userId: me.id, createdAt: at, customer: { name: name, phone: phone, email: email, address: fulfillment === 'delivery' ? address : '' },
        items: items, subtotal: subtotal, shippingFee: shippingFee, total: subtotal + shippingFee, fulfillment: fulfillment, branch: branch,
        payment: { method: input.paymentMethod, label: PAY_METHODS[input.paymentMethod] }, txnId: txnId, stageIndex: 0,
        stageHistory: [{ stage: 0, label: STAGES[0], at: at, by: me.id }], estimatedDelivery: null, cancelled: null, restocked: false, attemptId: input.attemptId || null };
      var txn = { id: txnId, orderId: orderId, userId: me.id, amount: order.total, method: input.paymentMethod, methodLabel: PAY_METHODS[input.paymentMethod], status: status, simulated: true, createdAt: at,
        history: [{ status: status, at: at, by: me.id, note: input.paymentMethod === 'cod' ? 'Order placed \u2013 pay on receipt (simulated)' : 'Simulated payment submitted \u2013 awaiting staff confirmation' }] };
      existing.unshift(order); txns.unshift(txn);
      var cm = readCartMap(); cm[me.id] = [];
      var ok = write(KEYS.orders, existing) && write(KEYS.txns, txns) && catalogSave(catList) && write(KEYS.carts, cm);
      if (!ok) { restore(snap); return { ok: false, error: 'Could not save your order (browser storage is full or blocked). Nothing was charged or changed.' }; }
      emit();
      return { ok: true, order: order, txn: txn };
    },
    mine: function () {
      var me = currentUser(); if (!me || isAdmin(me)) return [];
      return allOrders().filter(function (o) { return o.userId === me.id; }).sort(byNewest);
    },
    all: function () { requireAdmin(); return allOrders().sort(byNewest); },
    get: function (id) {
      var me = currentUser(); if (!me) return null;
      var o = allOrders().filter(function (x) { return x.id === id; })[0];
      if (!o) return null;
      return (isAdmin(me) || o.userId === me.id) ? o : null;
    },
    forCustomer: function (userId) { requireAdmin(); return allOrders().filter(function (o) { return o.userId === userId; }).sort(byNewest); }
  };
  var txns = {
    mine: function () {
      var me = currentUser(); if (!me || isAdmin(me)) return [];
      return allTxns().filter(function (t) { return t.userId === me.id; }).sort(byNewest);
    },
    all: function () { requireAdmin(); return allTxns().sort(byNewest); },
    get: function (id) {
      var me = currentUser(); if (!me) return null;
      var t = allTxns().filter(function (x) { return x.id === id; })[0];
      return t && (isAdmin(me) || t.userId === me.id) ? t : null;
    },
    forOrder: function (orderId) {
      var me = currentUser(); if (!me) return null;
      var t = allTxns().filter(function (x) { return x.orderId === orderId; })[0];
      return t && (isAdmin(me) || t.userId === me.id) ? t : null;
    }
  };

  /* staff-only order mutations: all verify the administrator and are rolled back if saving fails */
  function mutate(orderId, fn) {
    requireAdmin();
    var me = currentUser(), snap = snapshot();
    var list = allOrders(), order = list.filter(function (o) { return o.id === orderId; })[0];
    if (!order) return { ok: false, error: 'Order not found.' };
    var tl = allTxns(), txn = tl.filter(function (t) { return t.id === order.txnId || t.orderId === order.id; })[0] || null;
    var cat = catalogAll();
    var res = fn(order, txn, cat, me.id);
    if (res && res.error) return { ok: false, error: res.error };
    if (!(write(KEYS.orders, list) && write(KEYS.txns, tl) && catalogSave(cat))) { restore(snap); return { ok: false, error: 'Could not save changes (storage full).' }; }
    emit(); return { ok: true };
  }
  function cancelInternal(order, txn, cat, by, reason) {
    restockOrder(order, cat);
    order.cancelled = { at: nowISO(), by: by, reason: reason || '' };
    if (txn && txn.status !== 'Failed' && txn.status !== 'Refunded') pushTxn(txn, txn.status === 'Paid' ? 'Refunded' : 'Failed', by, 'Order cancelled' + (reason ? ': ' + reason : ''));
  }
  var staff = {
    advanceStage: function (orderId) {
      return mutate(orderId, function (o, t, cat, by) {
        if (o.cancelled) return { error: 'This order is cancelled.' };
        if (o.stageIndex >= STAGES.length - 1) return { error: 'This order is already delivered.' };
        var next = o.stageIndex + 1;
        if (next === 1 && t && t.status !== 'Paid' && t.method !== 'cod') return { error: 'Confirm the simulated payment first.' };
        if (next === STAGES.length - 1 && t && t.status !== 'Paid') {
          if (t.method === 'cod') pushTxn(t, 'Paid', by, 'Cash collected on receipt (simulated)'); else return { error: 'Payment is not confirmed.' };
        }
        o.stageIndex = next; o.stageHistory.push({ stage: next, label: STAGES[next], at: nowISO(), by: by });
      });
    },
    revertStage: function (orderId) {
      return mutate(orderId, function (o) {
        if (o.cancelled) return { error: 'This order is cancelled.' };
        if (o.stageIndex <= 0) return { error: 'Already at the first stage.' };
        o.stageHistory = o.stageHistory.filter(function (h) { return h.stage !== o.stageIndex; });
        o.stageIndex -= 1;
      });
    },
    setEta: function (orderId, dateStr) {
      return mutate(orderId, function (o) {
        if (o.cancelled) return { error: 'This order is cancelled.' };
        if (!dateStr) { o.estimatedDelivery = null; return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(new Date(dateStr))) return { error: 'Please choose a valid date.' };
        if (o.createdAt && dateStr < o.createdAt.slice(0, 10)) return { error: 'The estimate cannot be before the order date.' };
        o.estimatedDelivery = dateStr;
      });
    },
    cancelOrder: function (orderId, reason) {
      return mutate(orderId, function (o, t, cat, by) {
        if (o.cancelled) return { error: 'Already cancelled.' };
        if (o.stageIndex >= STAGES.length - 1) return { error: 'Delivered orders cannot be cancelled.' };
        cancelInternal(o, t, cat, by, reason);
      });
    },
    setPaymentStatus: function (txnId, status, note) {
      requireAdmin();
      var t = allTxns().filter(function (x) { return x.id === txnId; })[0];
      if (!t) return { ok: false, error: 'Transaction not found.' };
      return mutate(t.orderId, function (o, txn, cat, by) {
        if (!txn) return { error: 'Transaction not found.' };
        if (PAY_STATUSES.indexOf(status) < 0) return { error: 'Unknown status.' };
        if (PAY_TRANSITIONS[txn.status].indexOf(status) < 0) return { error: 'A ' + txn.status + ' payment cannot be changed to ' + status + '.' };
        if (status === 'Failed' || status === 'Refunded') {
          if (o.cancelled || o.stageIndex >= STAGES.length - 1) pushTxn(txn, status, by, note || 'Updated by staff');   // delivered/cancelled: record only, no restock
          else cancelInternal(o, txn, cat, by, 'Payment ' + status.toLowerCase());                                      // otherwise cancel + restock
          return;
        }
        pushTxn(txn, status, by, note || (status === 'Paid' ? 'Simulated payment confirmed by staff' : ''));
        if (status === 'Paid' && !o.cancelled && o.stageIndex === 0) { o.stageIndex = 1; o.stageHistory.push({ stage: 1, label: STAGES[1], at: nowISO(), by: by }); }
      });
    }
  };

  /* ------------------------------------------------------------------ one-time migration of older data */
  function migrate() {
    if (rawGet(KEYS.schema) === SCHEMA_VERSION) return;
    // 1. legacy plaintext accounts -> hashed customer accounts (plaintext removed)
    var legacyUsers = readObj('kate_registered_users'), users = getUsers();
    Object.keys(legacyUsers).forEach(function (email) {
      var lu = legacyUsers[email]; email = String(email).toLowerCase();
      if (!lu || email === ADMIN_EMAIL || users.some(function (u) { return u.email === email; })) return;
      var salt = rand(32, '0123456789abcdef');
      users.push({ id: 'u-' + Date.now().toString(36) + rand(5, 'abcdefghijklmnopqrstuvwxyz0123456789'), name: lu.name || email.split('@')[0], email: email, role: 'customer',
        phone: '', address: '', salt: salt, hash: hashPassword(salt, String(lu.password || rand(16, 'abcdef0123456789'))), createdAt: nowISO() });
    });
    saveUsers(users);
    rawSet('kate_registered_users', null); rawSet('kate_user', null);
    // 2. legacy single cart / wishlist -> guest cart / wishlist
    var oldCart = read('kate_cart', null);
    if (Array.isArray(oldCart) && oldCart.length) {
      var cm = readCartMap(); if (!Array.isArray(cm.guest) || !cm.guest.length) { cm.guest = oldCart.map(function (l) { return { id: Number(l.id), qty: Number(l.quantity || l.qty) || 1 }; }); write(KEYS.carts, cm); }
    }
    rawSet('kate_cart', null);
    var oldWish = read('kate_wishlist', null);
    if (Array.isArray(oldWish) && oldWish.length) { var wm = readObj(KEYS.wishlists); if (!wm.guest) { wm.guest = oldWish.map(Number); write(KEYS.wishlists, wm); } }
    rawSet('kate_wishlist', null);
    // 3. remove fabricated "sample data"; give genuine older orders a transaction record
    var rawOrders = readArr(KEYS.orders).filter(function (o) { return o && !o.demo; }), t = allTxns();
    rawOrders = rawOrders.map(function (o) {
      var n = normOrder(o);
      if (!n.txnId) {
        var tid = 'TXN-' + (n.createdAt || nowISO()).slice(0, 10).replace(/-/g, '') + '-' + rand(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
        t.push({ id: tid, orderId: n.id, userId: n.userId, amount: n.total, method: n.payment.method, methodLabel: n.payment.label || n.payment.method || 'Unknown', status: n.cancelled ? 'Failed' : 'Pending', simulated: true,
          createdAt: n.createdAt, history: [{ status: n.cancelled ? 'Failed' : 'Pending', at: n.createdAt, by: 'system', note: 'Created when upgrading from an earlier version' }] });
        n.txnId = tid;
      }
      return n;
    });
    write(KEYS.orders, rawOrders); write(KEYS.txns, t);
    write(KEYS.inquiries, readArr(KEYS.inquiries).filter(function (q) { return q && !q.demo; }));
    rawSet(KEYS.schema, SCHEMA_VERSION);
  }

  /* ------------------------------------------------------------------ UI helpers shared by every page */
  var CSS = '.kgnav{background:#3D1223;color:#FCEEF2;font-family:"Plus Jakarta Sans",system-ui,sans-serif;position:relative;z-index:45}' +
    '.kgnav-in{max-width:80rem;margin:0 auto;padding:0 12px;display:flex;align-items:center;gap:12px;min-height:40px}' +
    '.kgnav-brand{font-weight:800;font-size:12px;color:#F3C0D0;text-decoration:none;white-space:nowrap}' +
    '.kgnav nav{display:flex;gap:2px;overflow-x:auto;flex:1;scrollbar-width:none}.kgnav nav::-webkit-scrollbar{display:none}' +
    '.kgnav a.kl,.kgnav button.kl{color:#FCEEF2;font-size:11px;font-weight:700;padding:11px 9px;white-space:nowrap;text-decoration:none;background:none;border:0;border-bottom:2px solid transparent;cursor:pointer;font-family:inherit}' +
    '.kgnav a.kl:hover,.kgnav button.kl:hover{color:#fff;background:rgba(255,255,255,.08)}.kgnav .kl.on{border-bottom-color:#E297AF;color:#fff}' +
    '.kgnav .kb{display:inline-block;min-width:16px;padding:0 4px;margin-left:4px;border-radius:99px;background:#E297AF;color:#3D1223;font-size:10px;font-weight:800;text-align:center}' +
    '.kgnav-user{font-size:10px;color:#F3C0D0;white-space:nowrap}.kgnav-user b{color:#fff}' +
    '@media(max-width:640px){.kgnav-user{display:none}}' +
    '.kg-role-admin [data-customer-only]{display:none!important}' +
    '#kgToasts{position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:calc(100vw - 32px)}' +
    '.kgt{pointer-events:auto;font:700 12px "Plus Jakarta Sans",system-ui,sans-serif;color:#fff;padding:12px 16px;border-radius:16px;box-shadow:0 10px 30px rgba(61,18,35,.3);opacity:0;transform:translateY(8px);transition:.25s;max-width:320px}' +
    '.kgt.show{opacity:1;transform:none}.kgt.success{background:#7B314E}.kgt.error{background:#dc2626}.kgt.info{background:#592037}' +
    '.kgc{position:fixed;inset:0;z-index:9998;background:rgba(89,32,55,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Plus Jakarta Sans",system-ui,sans-serif}' +
    '.kgc-box{background:#fff;border-radius:20px;max-width:420px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(61,18,35,.35);animation:kgpop .18s ease-out}@keyframes kgpop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}' +
    '.kgc-box h3{margin:0 0 6px;font-size:15px;font-weight:800;color:#3D1223}.kgc-box p{margin:0 0 16px;font-size:12px;color:#592037;line-height:1.5}' +
    '.kgc-row{display:flex;justify-content:flex-end;gap:8px}.kgc-row button{font:700 12px inherit;font-family:inherit;padding:9px 16px;border-radius:12px;cursor:pointer;border:1px solid #F8DDE5;background:#fff;color:#592037}' +
    '.kgc-row button.ok{background:#7B314E;color:#fff;border-color:#7B314E}.kgc-row button.danger{background:#dc2626;border-color:#dc2626;color:#fff}' +
    '.kgcond{display:inline-block;font:800 9px "Plus Jakarta Sans",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:99px;white-space:nowrap;vertical-align:middle}' +
    '.kgcond.new{background:#D1FAE5;color:#065F46}.kgcond.preowned{background:#FCEEF2;color:#7B314E;border:1px solid #E297AF}' +
    '.kgcond-grade{font-size:10px;font-weight:700;margin-left:6px;vertical-align:middle}' +
    '.kg-sim{background:#FFF7E6;border:1px solid #F5D58B;color:#7A5300;border-radius:12px;padding:8px 12px;font-size:11px;font-weight:700}';
  function injectCss() {
    if (document.getElementById('kgCss')) return;
    var s = document.createElement('style'); s.id = 'kgCss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }
  // Label HTML for a product condition: a New / Pre-Owned pill plus the exact grade for pre-owned items
  function conditionPill(c) {
    injectCss();
    var k = conditionKind(c);
    return '<span class="kgcond ' + k + '">' + (k === 'new' ? 'Brand New' : 'Pre-Owned') + '</span>';
  }
  function conditionLabel(c) {
    if (!c) return '';
    var k = conditionKind(c);
    return conditionPill(c) + (k === 'new' ? '' : '<span class="kgcond-grade">' + esc(c) + '</span>');
  }
  function toast(msg, type) {
    injectCss();
    var box = document.getElementById('kgToasts');
    if (!box) { box = document.createElement('div'); box.id = 'kgToasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'kgt ' + (type || 'info'); t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, type === 'error' ? 4500 : 3000);
  }
  function confirmBox(title, message, okLabel, danger) {
    injectCss();
    return new Promise(function (resolve) {
      var w = document.createElement('div'); w.className = 'kgc'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
      w.innerHTML = '<div class="kgc-box"><h3>' + esc(title) + '</h3><p>' + esc(message) + '</p><div class="kgc-row"><button type="button" data-c>Cancel</button><button type="button" class="' + (danger ? 'danger' : 'ok') + '" data-o>' + esc(okLabel || 'Confirm') + '</button></div></div>';
      function done(v) { document.removeEventListener('keydown', key); w.remove(); resolve(v); }
      function key(e) { if (e.key === 'Escape') done(false); }
      w.querySelector('[data-c]').onclick = function () { done(false); };
      w.querySelector('[data-o]').onclick = function () { done(true); };
      w.addEventListener('click', function (e) { if (e.target === w) done(false); });
      document.addEventListener('keydown', key); document.body.appendChild(w); w.querySelector('[data-o]').focus();
    });
  }
  function navItems(u) {
    var common = [['Home', 'index.html'], ['Products', 'index.html#catalog'], ['About', 'about.html']];
    if (isAdmin(u)) return common.concat([['Staff Dashboard', 'dashboard.html#overview'], ['Orders', 'dashboard.html#orders'], ['Transactions', 'dashboard.html#transactions'], ['Inventory', 'dashboard.html#inventory'], ['Customers', 'dashboard.html#customers']]);
    if (u) return common.concat([['Cart', 'cart-dashboard.html', 'cart'], ['Transactions', 'transactions.html'], ['Order Tracking', 'tracking.html'], ['Account', 'account.html']]);
    return common.concat([['Cart', 'cart-dashboard.html', 'cart']]);
  }
  function mountNav() {
    injectCss();
    var u = currentUser();
    document.body.classList.toggle('kg-role-admin', isAdmin(u));
    var host = document.getElementById('kgSiteNav');
    if (!host) { host = document.createElement('div'); host.id = 'kgSiteNav'; document.body.insertBefore(host, document.body.firstChild); }
    var file = (location.pathname.split('/').pop() || 'index.html'), hash = location.hash;
    var html = navItems(u).map(function (it) {
      var parts = it[1].split('#'), on = parts[0] === file && (parts[1] ? ('#' + parts[1] === hash || (!hash && parts[1] === 'overview' && file === 'dashboard.html')) : (file !== 'index.html' || hash !== '#catalog'));
      if (it[1] === 'index.html#catalog') on = file === 'index.html' && hash === '#catalog';
      return '<a class="kl' + (on ? ' on' : '') + '" href="' + it[1] + '">' + esc(it[0]) + (it[2] === 'cart' ? '<span class="kb" data-kg-cart-count>' + cart.count() + '</span>' : '') + '</a>';
    }).join('');
    if (u) html += '<button type="button" class="kl" data-kg-logout>Logout</button>';
    else html += '<button type="button" class="kl" data-kg-login>Sign In</button>';
    host.innerHTML = '<div class="kgnav"><div class="kgnav-in"><a class="kgnav-brand" href="index.html">Kate\u2019s Gadgets</a><nav aria-label="Site">' + html + '</nav>' +
      (u ? '<span class="kgnav-user">Signed in: <b>' + esc(u.name.split(' ')[0]) + '</b>' + (isAdmin(u) ? ' \u00B7 Admin' : '') + '</span>' : '') + '</div></div>';
    syncPageBits(u);
    var lo = host.querySelector('[data-kg-logout]'); if (lo) lo.onclick = function () { logout(); toast('Signed out.', 'info'); setTimeout(function () { location.href = 'index.html'; }, 300); };
    var li = host.querySelector('[data-kg-login]'); if (li) li.onclick = function () { if (typeof global.openAuthModal === 'function') global.openAuthModal('login'); else location.href = 'index.html?login=1'; };
  }
  function syncPageBits(u) {      // lets static page headers show live cart info and the right account link
    var n = cart.count(), total = cartDetailed().subtotal;
    [].forEach.call(document.querySelectorAll('[data-kg-cart-count]'), function (el) { el.textContent = n; });
    [].forEach.call(document.querySelectorAll('[data-kg-cart-total]'), function (el) { el.textContent = peso(total); });
    [].forEach.call(document.querySelectorAll('[data-kg-account-link]'), function (el) { el.setAttribute('href', isAdmin(u) ? 'dashboard.html#overview' : u ? 'account.html' : 'index.html?login=1'); });
  }
  function guard(mode) {
    var u = currentUser(), ok = false, to = 'index.html';
    if (mode === 'admin') { ok = isAdmin(u); to = u ? 'index.html?denied=1' : 'index.html?login=1'; }
    else if (mode === 'shopper') { if (isAdmin(u)) to = 'dashboard.html#overview'; else ok = true; }   // guests + customers; staff are sent to their dashboard
    else if (!u) to = 'index.html?login=1';
    else if (mode === 'customer') { if (isAdmin(u)) to = 'dashboard.html#' + (/tracking/.test(location.pathname) ? 'orders' : /transactions/.test(location.pathname) ? 'transactions' : 'overview'); else ok = true; }
    else ok = true;
    document.documentElement.style.visibility = ok ? '' : 'hidden';
    if (!ok) location.replace(to);
    global.__kgGuardMode = mode;
    return ok;
  }
  global.addEventListener('pageshow', function (e) { if (e.persisted && global.__kgGuardMode) guard(global.__kgGuardMode); });   // back-button after logout

  function init() {
    try { migrate(); ensureAdmin(); catalogAll(); } catch (e) { if (global.console) console.error('KG init failed', e); }
  }
  init();

  function onReady(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  onReady(function () {
    mountNav();
    global.addEventListener('kg:change', function () { mountNav(); });
    global.addEventListener('hashchange', mountNav);
  });

  global.KG = {
    KEYS: KEYS, STORES: STORES, STAGES: STAGES, PAY_STATUSES: PAY_STATUSES, PAY_METHODS: PAY_METHODS, PAY_TRANSITIONS: PAY_TRANSITIONS,
    SHIPPING_FEE: SHIPPING_FEE, CATEGORY_IDS: CATEGORY_IDS, CONDITIONS: CONDITIONS, CONDITION_INFO: CONDITION_INFO, conditionKind: conditionKind, conditionDesc: conditionDesc, ADMIN_EMAIL: ADMIN_EMAIL,
    util: { esc: esc, peso: peso, fmtDate: fmtDate, fmtDateTime: fmtDateTime, read: read, write: write, same: same },
    auth: { currentUser: currentUser, isAdmin: isAdmin, register: register, login: login, logout: logout, updateProfile: updateProfile, changePassword: changePassword, customers: customers },
    catalog: catalog, cart: cart, wishlist: wishlist, orders: orders, txns: txns, staff: staff,
    orderStatus: orderStatus, emit: emit,
    inquiries: { all: function () { requireAdmin(); return readArr(KEYS.inquiries); }, save: function (l) { requireAdmin(); return write(KEYS.inquiries, l); } },
    ui: { conditionPill: conditionPill, conditionLabel: conditionLabel, toast: toast, confirm: confirmBox, mountNav: mountNav, onReady: onReady },
    guard: guard
  };
})(window);
