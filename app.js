const CFG = window.STORE_CONFIG || {};
let state = null;
let activeCategory = 'all';
let userLocation = null;
let currentInquiryProduct = null;

const $ = selector => document.querySelector(selector);
const esc = value => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

function rawBase() {
  return 'https://raw.githubusercontent.com/' + CFG.owner + '/' + CFG.repo + '/' + CFG.branch + '/';
}
function isLocal() {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}
function dataUrl() {
  const path = CFG.dataPath || 'data/db.json';
  if (/^https?:\/\//i.test(path)) {
    return path + (path.includes('?') ? '&' : '?') + 't=' + Date.now();
  }
  if (isLocal()) return path + '?t=' + Date.now();
  return rawBase() + path + '?t=' + Date.now();
}
function imageUrl(path) {
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  if (isLocal()) return clean;
  return rawBase() + clean;
}
function money(value, currency) {
  return Number(value || 0).toLocaleString('en-US') + ' ' + (currency || '');
}

function placeholder(product) {
  const label = esc(product.name || 'Product').slice(0, 28);
  const isPhone = product.category === 'phones';
  const c1 = isPhone ? '#22d3ee' : '#f59e0b';
  const c2 = isPhone ? '#8b5cf6' : '#25d366';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="600" height="420" fill="#101a34"/>
    <circle cx="300" cy="170" r="125" fill="url(#g)" opacity=".22"/>
    <rect x="238" y="52" width="124" height="236" rx="24" fill="none" stroke="url(#g)" stroke-width="8"/>
    <rect x="253" y="78" width="94" height="184" rx="12" fill="url(#g)" opacity=".38"/>
    <text x="300" y="340" text-anchor="middle" fill="#eef2ff" font-family="Arial" font-size="26" font-weight="bold">${label}</text>
    <text x="300" y="375" text-anchor="middle" fill="#9aa8cc" font-family="Arial" font-size="18">${isPhone ? 'MOBILE' : 'ACCESSORY'}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function productImage(product) {
  if (product.image && String(product.image).trim()) return esc(imageUrl(product.image));
  return placeholder(product);
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sortedStores() {
  let list = state.stores.slice();
  const city = $('#cityFilter').value;
  if (city) list = list.filter(s => s.city === city);
  if (userLocation) {
    list.sort((a, b) => {
      const da = Number.isFinite(Number(a.lat)) && Number.isFinite(Number(a.lng))
        ? distanceKm(userLocation.lat, userLocation.lng, Number(a.lat), Number(a.lng)) : Infinity;
      const db = Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lng))
        ? distanceKm(userLocation.lat, userLocation.lng, Number(b.lat), Number(b.lng)) : Infinity;
      return da - db;
    });
  }
  return list;
}

function waLink(phone, message) {
  return 'https://wa.me/' + String(phone || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
}

function inquiryMessage(product, store) {
  const cur = state.settings.currency || '';
  return `مرحباً ${store ? store.name : ''}، أريد الاستفسار عن:\n` +
    `المنتج: ${product.name}\n` +
    `السعر: ${money(product.price, cur)}\n` +
    `هل هو متوفر؟ وما هي المواصفات والضمان؟`;
}

function renderCategories() {
  const bar = $('#categoryBar');
  const cats = [{ id: 'all', name: 'الكل', icon: '✦' }].concat(state.categories || []);
  bar.innerHTML = cats.map(c => `
    <button class="chip ${activeCategory === c.id ? 'active' : ''}" data-cat="${esc(c.id)}">
      ${esc(c.icon || '')} ${esc(c.name)}
    </button>`).join('');
  bar.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const query = ($('#search').value || '').trim().toLowerCase();
  const sort = $('#sort').value;
  const cur = state.settings.currency || '';
  let list = state.products.slice();

  if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory);
  if (query) {
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.brand || '').toLowerCase().includes(query) ||
      (p.specs || '').toLowerCase().includes(query)
    );
  }
  if (sort === 'low') list.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === 'high') list.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

  const grid = $('#productsGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty">لا توجد منتجات مطابقة. جرّب كلمة بحث أخرى.</div>';
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="product-image">
        <img src="${productImage(p)}" alt="${esc(p.name)}" loading="lazy">
        ${p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ''}
      </div>
      <div class="product-body">
        <span class="product-brand">${esc(p.brand || '')}</span>
        <h3 class="product-name">${esc(p.name)}</h3>
        <div class="product-specs">${esc(p.specs || '')}</div>
        <div class="price-row">
          <span class="price">${money(p.price, cur)}</span>
          ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice, cur)}</span>` : ''}
        </div>
        <span class="stock">${esc(p.stock || 'متوفر')}</span>
        <div class="card-actions">
          <button class="btn btn-small" data-ask="${esc(p.id)}">اسأل عن المنتج</button>
        </div>
      </div>
    </article>`).join('');

  grid.querySelectorAll('[data-ask]').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = state.products.find(p => p.id === btn.dataset.ask);
      if (product) openInquiry(product);
    });
  });
}

function renderOffers() {
  const offers = (state.offers || []).filter(o => o.active !== false);
  const grid = $('#offersGrid');
  if (!offers.length) {
    grid.innerHTML = '<div class="empty">لا توجد عروض حالياً.</div>';
    return;
  }
  grid.innerHTML = offers.map(o => {
    const product = state.products.find(p => p.id === o.productId);
    return `
      <article class="offer">
        <span class="offer-badge">${esc(o.badge || 'عرض')}</span>
        <h3>${esc(o.title)}</h3>
        <p>${esc(o.description || '')}</p>
        ${product ? `<button class="btn btn-small" data-offer="${esc(product.id)}">اسأل عن العرض</button>` : ''}
      </article>`;
  }).join('');

  grid.querySelectorAll('[data-offer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = state.products.find(p => p.id === btn.dataset.offer);
      if (product) openInquiry(product);
    });
  });
}

function renderStores() {
  const list = sortedStores();
  const grid = $('#storesGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty">لا توجد فروع في هذا الاختيار.</div>';
    return;
  }
  grid.innerHTML = list.map(s => {
    let distanceHtml = '';
    if (userLocation && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng))) {
      const d = distanceKm(userLocation.lat, userLocation.lng, Number(s.lat), Number(s.lng));
      distanceHtml = `<span class="distance">على بُعد ${d.toFixed(1)} كم منك</span>`;
    }
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address || s.name)}`;
    return `
      <article class="store">
        <h3>${esc(s.name)}</h3>
        <span class="city">${esc(s.city || '')}</span>
        <p>${esc(s.address || '')}<br>${esc(s.hours || '')}</p>
        <div class="store-meta">☎ ${esc(s.phone || '')}</div>
        ${distanceHtml}
        <div class="store-actions">
          <a class="btn btn-small btn-wa" target="_blank" rel="noopener"
             href="${waLink(s.whatsapp, 'مرحباً، أريد الاستفسار عن منتج.')}">واتساب</a>
          <a class="btn btn-small btn-outline" target="_blank" rel="noopener" href="${esc(maps)}">الخريطة</a>
          <a class="btn btn-small btn-outline" href="tel:${esc(String(s.phone || '').replace(/\s/g, ''))}">اتصال</a>
        </div>
      </article>`;
  }).join('');
}

function populateCities() {
  const select = $('#cityFilter');
  const cities = Array.from(new Set(state.stores.map(s => s.city).filter(Boolean)));
  select.innerHTML = '<option value="">كل المحافظات</option>' +
    cities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function openInquiry(product) {
  currentInquiryProduct = product;
  const modal = $('#inquiryModal');
  $('#modalProduct').textContent = product.name + ' — ' + money(product.price, state.settings.currency);
  const list = sortedStores();
  $('#modalStores').innerHTML = list.length ? list.map(s => {
    let dist = '';
    if (userLocation && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng))) {
      const d = distanceKm(userLocation.lat, userLocation.lng, Number(s.lat), Number(s.lng));
      dist = `${d.toFixed(1)} كم`;
    }
    return `
      <div class="modal-store">
        <div>
          <strong>${esc(s.name)}</strong>
          <small>${esc(s.city || '')} ${dist ? '· ' + dist : ''}</small>
        </div>
        <a class="btn btn-small btn-wa" target="_blank" rel="noopener"
           href="${waLink(s.whatsapp, inquiryMessage(product, s))}">إرسال</a>
      </div>`;
  }).join('') : '<div class="empty">لا توجد فروع متاحة حالياً.</div>';
  modal.hidden = false;
}

function closeInquiry() {
  $('#inquiryModal').hidden = true;
  currentInquiryProduct = null;
}

function initStaticText() {
  $('#siteName').textContent = state.settings.siteName || 'نور للاتصالات';
  $('#heroText').textContent = state.settings.tagline || '';
  $('#aboutText').textContent = state.settings.about || '';
  $('#footerName').textContent = state.settings.siteName || 'نور للاتصالات';
  $('#year').textContent = new Date().getFullYear();
  $('#floatWa').href = waLink(
    state.settings.whatsappDefault,
    'مرحباً، أريد الاستفسار عن منتجاتكم وأسعاركم.'
  );
}

async function load() {
  const res = await fetch(dataUrl());
  if (!res.ok) throw new Error('فشل تحميل البيانات من GitHub');
  state = await res.json();
  initStaticText();
  populateCities();
  renderCategories();
  renderProducts();
  renderOffers();
  renderStores();

  $('#search').addEventListener('input', renderProducts);
  $('#sort').addEventListener('change', renderProducts);
  $('#cityFilter').addEventListener('change', renderStores);
  $('#closeModal').addEventListener('click', closeInquiry);
  $('#inquiryModal').addEventListener('click', e => {
    if (e.target.id === 'inquiryModal') closeInquiry();
  });

  $('#locateBtn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع. اختر المحافظة يدوياً.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        renderStores();
        if (!$('#inquiryModal').hidden && currentInquiryProduct) openInquiry(currentInquiryProduct);
      },
      () => alert('تعذّر الوصول إلى موقعك. اختر المحافظة يدوياً.'),
      { timeout: 8000 }
    );
  });
}

load().catch(err => {
  document.body.innerHTML = '<div class="empty">تعذّر تحميل الموقع: ' + esc(err.message) +
    '<br>تأكد من تعديل ملف <code>config.js</code> باسم المستخدم والمستودع الصحيحين.</div>';
});
