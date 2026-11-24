let config = null;
let state = null;
const editing = { products: null, stores: null, offers: null };
const FORM_PREFIX = { products: 'product', stores: 'store', offers: 'offer' };

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = v => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem('phoneStoreFreeConfig') || 'null');
    if (saved && saved.owner && saved.repo && saved.token) return saved;
  } catch (e) {}
  const c = Object.assign({}, window.STORE_CONFIG || {});
  if (c.token) delete c.token;
  return c;
}

function apiBase() {
  return 'https://api.github.com/repos/' + config.owner + '/' + config.repo + '/contents';
}
function rawBase() {
  return 'https://raw.githubusercontent.com/' + config.owner + '/' + config.repo + '/' + config.branch + '/';
}
function headers() {
  return {
    'Authorization': 'Bearer ' + config.token,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
}
function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function decodeBase64Utf8(str) {
  const bin = atob(String(str).replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
async function getFile(path) {
  const res = await fetch(apiBase() + '/' + path + '?ref=' + encodeURIComponent(config.branch), {
    headers: headers()
  });
  if (!res.ok) throw new Error(res.status === 404 ? 'الملف غير موجود في المستودع' : 'فشل القراءة من GitHub (' + res.status + ')');
  const data = await res.json();
  return { sha: data.sha, content: decodeBase64Utf8(data.content) };
}
async function putFile(path, content, message, sha, isBase64) {
  const body = {
    message: message,
    content: isBase64 ? content : encodeBase64Utf8(content),
    branch: config.branch
  };
  if (sha) body.sha = sha;
  const res = await fetch(apiBase() + '/' + path, {
    method: 'PUT', headers: headers(), body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'فشل الحفظ في GitHub');
  return data;
}
async function loadState() {
  const file = await getFile(config.dataPath || 'data/db.json');
  state = JSON.parse(file.content);
  state._sha = file.sha;
}
async function saveState() {
  const clean = Object.assign({}, state);
  delete clean._sha;
  await putFile(config.dataPath || 'data/db.json', JSON.stringify(clean, null, 2), 'Update store data', state._sha);
}
async function uploadImage(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = (config.imagesPath || 'images') + '/' + safeName;
  const base64 = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
  let existingSha = null;
  try { existingSha = (await getFile(path)).sha; } catch (e) {}
  await putFile(path, base64, 'Upload product image', existingSha, true);
  return rawBase() + path;
}

function showMsg(text, isError) {
  const msg = $('#msg');
  msg.textContent = text;
  msg.classList.toggle('err', !!isError);
  msg.hidden = false;
  clearTimeout(showMsg.timer);
  showMsg.timer = setTimeout(() => { msg.hidden = true; }, 4000);
}

function fillSelect(select, items, valueKey, labelKey, emptyLabel) {
  select.innerHTML = (emptyLabel ? `<option value="">${esc(emptyLabel)}</option>` : '') +
    items.map(i => `<option value="${esc(i[valueKey])}">${esc(i[labelKey])}</option>`).join('');
}

function renderProducts() {
  $('#productsTable').innerHTML = `
    <thead><tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>الشارة</th><th>إجراءات</th></tr></thead>
    <tbody>${state.products.map(p => `
      <tr>
        <td><span class="name-cell">${esc(p.name)}</span><small>${esc(p.brand || '')} — ${esc(p.specs || '')}</small></td>
        <td>${esc((state.categories.find(c => c.id === p.category) || {}).name || p.category)}</td>
        <td>${Number(p.price || 0).toLocaleString('en-US')} ${esc(state.settings.currency || '')}</td>
        <td>${esc(p.badge || '—')}</td>
        <td><div class="row-actions">
          <button class="btn btn-small" data-edit="products" data-id="${esc(p.id)}">تعديل</button>
          <button class="btn btn-small btn-danger" data-del="products" data-id="${esc(p.id)}">حذف</button>
        </div></td>
      </tr>`).join('') || '<tr><td colspan="5">لا توجد منتجات.</td></tr>'}</tbody>`;
}

function renderStores() {
  $('#storesTable').innerHTML = `
    <thead><tr><th>الفرع</th><th>المحافظة</th><th>الهاتف</th><th>واتساب</th><th>إجراءات</th></tr></thead>
    <tbody>${state.stores.map(s => `
      <tr>
        <td><span class="name-cell">${esc(s.name)}</span><small>${esc(s.address || '')}</small></td>
        <td>${esc(s.city || '')}</td>
        <td>${esc(s.phone || '')}</td>
        <td>${esc(s.whatsapp || '')}</td>
        <td><div class="row-actions">
          <button class="btn btn-small" data-edit="stores" data-id="${esc(s.id)}">تعديل</button>
          <button class="btn btn-small btn-danger" data-del="stores" data-id="${esc(s.id)}">حذف</button>
        </div></td>
      </tr>`).join('') || '<tr><td colspan="5">لا توجد فروع.</td></tr>'}</tbody>`;
}

function renderOffers() {
  $('#offersTable').innerHTML = `
    <thead><tr><th>العرض</th><th>الشارة</th><th>المنتج</th><th>الحالة</th><th>إجراءات</th></tr></thead>
    <tbody>${state.offers.map(o => {
      const p = state.products.find(x => x.id === o.productId);
      return `<tr>
        <td><span class="name-cell">${esc(o.title)}</span><small>${esc(o.description || '')}</small></td>
        <td>${esc(o.badge || '—')}</td>
        <td>${esc(p ? p.name : '—')}</td>
        <td>${o.active !== false ? 'نشط' : 'متوقف'}</td>
        <td><div class="row-actions">
          <button class="btn btn-small" data-edit="offers" data-id="${esc(o.id)}">تعديل</button>
          <button class="btn btn-small btn-danger" data-del="offers" data-id="${esc(o.id)}">حذف</button>
        </div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">لا توجد عروض.</td></tr>'}</tbody>`;
}

function fillForm(formSelector, obj) {
  const form = $(formSelector);
  Object.keys(obj).forEach(key => {
    const el = form.elements[key];
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!obj[key];
    else el.value = obj[key] == null ? '' : obj[key];
  });
}

function resetForm(type) {
  const prefix = FORM_PREFIX[type] || type;
  const form = $('#' + prefix + 'Form');
  if (form) form.reset();
  editing[type] = null;
  const btn = $('#' + prefix + 'Submit');
  if (btn) btn.textContent = (type === 'products' ? 'إضافة منتج' : type === 'stores' ? 'إضافة فرع' : 'إضافة عرض');
}

function renderAll() {
  fillSelect($('#productCategory'), state.categories, 'id', 'name');
  fillSelect($('#offerProduct'), state.products, 'id', 'name', 'بدون منتج');
  renderProducts();
  renderStores();
  renderOffers();
  fillForm('#settingsForm', state.settings);
}

function initAdmin() {
  renderAll();

  $$('.tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $$('.panel').forEach(p => { p.hidden = p.id !== 'panel-' + tab; });
      const titles = { products: 'المنتجات', stores: 'الفروع', offers: 'العروض', settings: 'الإعدادات' };
      $('#pageTitle').textContent = titles[tab];
    });
  });

  $$('[data-reset]').forEach(b => b.addEventListener('click', () => resetForm(b.dataset.reset)));

  $('#uploadImageBtn').addEventListener('click', () => $('#productImageFile').click());
  $('#productImageFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showMsg('حجم الصورة يجب أن يكون أقل من 5 ميجابايت.', true);
      return;
    }
    try {
      showMsg('جاري رفع الصورة...');
      const url = await uploadImage(file);
      $('#productForm [name=image]').value = url;
      showMsg('تم رفع الصورة — اضغط حفظ المنتج ثم حفظ كل التغييرات.');
    } catch (err) {
      showMsg(err.message, true);
    }
  });

  $('#productForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const obj = {
      name: f.get('name'), brand: f.get('brand'), category: f.get('category'),
      price: Number(f.get('price')), oldPrice: Number(f.get('oldPrice')) || 0,
      specs: f.get('specs'), image: f.get('image'), badge: f.get('badge'), stock: f.get('stock')
    };
    if (editing.products) {
      const i = state.products.findIndex(p => p.id === editing.products);
      state.products[i] = Object.assign({}, state.products[i], obj);
    } else {
      obj.id = uid('p');
      state.products.push(obj);
    }
    resetForm('products');
    renderAll();
    showMsg('تم تحديث المنتج في الذاكرة — اضغط حفظ كل التغييرات.');
  });

  $('#storeForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const obj = {
      name: f.get('name'), city: f.get('city'), address: f.get('address'),
      phone: f.get('phone'), whatsapp: f.get('whatsapp'), hours: f.get('hours'),
      lat: Number(f.get('lat')) || null, lng: Number(f.get('lng')) || null
    };
    if (editing.stores) {
      const i = state.stores.findIndex(s => s.id === editing.stores);
      state.stores[i] = Object.assign({}, state.stores[i], obj);
    } else {
      obj.id = uid('s');
      state.stores.push(obj);
    }
    resetForm('stores');
    renderAll();
    showMsg('تم تحديث الفرع في الذاكرة — اضغط حفظ كل التغييرات.');
  });

  $('#offerForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const obj = {
      title: f.get('title'), description: f.get('description'),
      badge: f.get('badge'), productId: f.get('productId'), active: !!f.get('active')
    };
    if (editing.offers) {
      const i = state.offers.findIndex(o => o.id === editing.offers);
      state.offers[i] = Object.assign({}, state.offers[i], obj);
    } else {
      obj.id = uid('o');
      state.offers.push(obj);
    }
    resetForm('offers');
    renderAll();
    showMsg('تم تحديث العرض في الذاكرة — اضغط حفظ كل التغييرات.');
  });

  $('#settingsForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    ['siteName','tagline','currency','whatsappDefault','about'].forEach(k => {
      if (f.get(k)) state.settings[k] = f.get(k);
    });
    showMsg('تم تحديث الإعدادات — اضغط حفظ كل التغييرات.');
  });

  document.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    if (editBtn) {
      const type = editBtn.dataset.edit;
      const id = editBtn.dataset.id;
      const item = state[type].find(x => x.id === id);
      if (!item) return;
      editing[type] = id;
      fillForm('#' + FORM_PREFIX[type] + 'Form', item);
      $('#' + FORM_PREFIX[type] + 'Submit').textContent = 'حفظ التعديل';
      $$('.panel').forEach(p => { p.hidden = p.id !== 'panel-' + type; });
      showMsg('عدّل البيانات ثم اضغط حفظ التعديل.');
    }
    if (delBtn) {
      const type = delBtn.dataset.del;
      const id = delBtn.dataset.id;
      if (!confirm('هل تريد الحذف بالتأكيد؟')) return;
      state[type] = state[type].filter(x => x.id !== id);
      renderAll();
      showMsg('تم الحذف — اضغط حفظ كل التغييرات.');
    }
  });

  $('#saveBtn').addEventListener('click', async () => {
    try {
      await saveState();
      const file = await getFile(config.dataPath || 'data/db.json');
      state._sha = file.sha;
      showMsg('تم حفظ كل التغييرات على GitHub بنجاح.');
    } catch (err) {
      showMsg(err.message, true);
    }
  });

  $('#exportBtn').addEventListener('click', () => {
    const copy = Object.assign({}, state);
    delete copy._sha;
    const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'phone-store-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showMsg('تم تنزيل نسخة احتياطية.');
  });

  $('#importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.products) || !Array.isArray(data.stores) || !Array.isArray(data.offers) || !data.settings) {
          throw new Error('الملف غير صالح');
        }
        data._sha = state._sha;
        state = data;
        renderAll();
        showMsg('تم استيراد النسخة — اضغط حفظ كل التغييرات.');
      } catch (err) {
        showMsg('تعذّر استيراد الملف: ' + err.message, true);
      }
    };
    reader.readAsText(file);
  });

  $('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('phoneStoreFreeConfig');
    config = null;
    state = null;
    $('#admin').hidden = true;
    $('#login').hidden = false;
    $('#loginForm').reset();
  });
}

async function login(cfg) {
  config = cfg;
  await loadState();
  localStorage.setItem('phoneStoreFreeConfig', JSON.stringify(config));
  $('#login').hidden = true;
  $('#admin').hidden = false;
  initAdmin();
  showMsg('تم تسجيل الدخول بنجاح.');
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await login({
      owner: $('#loginOwner').value.trim(),
      repo: $('#loginRepo').value.trim(),
      branch: $('#loginBranch').value.trim() || 'main',
      dataPath: (window.STORE_CONFIG || {}).dataPath || 'data/db.json',
      imagesPath: (window.STORE_CONFIG || {}).imagesPath || 'images',
      token: $('#loginToken').value.trim()
    });
  } catch (err) {
    showMsg(err.message, true);
  }
});

const initial = loadConfig();
if (initial.owner && initial.repo && initial.token) {
  $('#loginOwner').value = initial.owner;
  $('#loginRepo').value = initial.repo;
  $('#loginBranch').value = initial.branch || 'main';
  $('#loginToken').value = initial.token;
}
