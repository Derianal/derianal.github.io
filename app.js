'use strict';

/*
 * KasirKu Portfolio Demo
 * Didasarkan pada alur aplikasi asli: katalog sumber HPP, harga aktif,
 * sinkronisasi yang mempertahankan harga manual, stok, checkout Tunai/QRIS,
 * riwayat, analisis, dan struk. Semua data pada build publik ini adalah simulasi lokal.
 */

const STORAGE_KEY = 'derian-kasirku-portfolio-demo-v2';
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const priceModes = {
  online: { label: 'Harga online', field: 'onlinePrice' },
  offline1: { label: 'Offline · 1 pcs', field: 'offline1' },
  offline10: { label: 'Offline · 10 pcs', field: 'offline10' },
  offline20: { label: 'Offline · 20+ pcs', field: 'offline20' }
};

// Harga/HPP di bawah sengaja berupa data contoh, bukan harga toko atau data spreadsheet Derian.
const sourceCatalog = [
  { sku:'BB-polybag-15x15', name:'Polybag 15 × 15 cm', category:'Polybag', source:'Benih Baik', emoji:'▤', cost:780, onlinePrice:1800, offline1:1600, offline10:1450, offline20:1300 },
  { sku:'BB-polybag-20x20', name:'Polybag 20 × 20 cm', category:'Polybag', source:'Benih Baik', emoji:'▤', cost:1150, onlinePrice:2600, offline1:2350, offline10:2200, offline20:2050 },
  { sku:'BB-cocopeat-1-kg', name:'Cocopeat 1 kg', category:'Media tanam', source:'Benih Baik', emoji:'▧', cost:4200, onlinePrice:8500, offline1:8000, offline10:7600, offline20:7200 },
  { sku:'BB-coco-chips-1-kg', name:'Coco Chips 1 kg', category:'Media tanam', source:'Benih Baik', emoji:'▧', cost:5100, onlinePrice:10500, offline1:9800, offline10:9400, offline20:9000 },
  { sku:'BB-benih-cabai-rawit-10g', name:'Benih Cabai Rawit 10 g', category:'Benih', source:'Benih Baik', emoji:'✿', cost:4800, onlinePrice:12000, offline1:11000, offline10:10500, offline20:10000 },
  { sku:'BB-benih-tomat-10g', name:'Benih Tomat 10 g', category:'Benih', source:'Benih Baik', emoji:'✿', cost:3900, onlinePrice:9800, offline1:9000, offline10:8600, offline20:8200 },
  { sku:'REM-jahe-bubuk-100g', name:'Jahe Bubuk 100 g', category:'Rempah', source:'Rempah', emoji:'◇', cost:6500, onlinePrice:15000, offline1:null, offline10:null, offline20:null }
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function localDateKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateAtOffset(days, hour = 10, minute = 15) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function sampleTransaction(id, dayOffset, sku, qty, mode, method, hour) {
  const p = sourceCatalog.find(item => item.sku === sku);
  const price = p[priceModes[mode].field];
  const time = dateAtOffset(dayOffset, hour, 15);
  const subtotal = price * qty;
  const profit = (price - p.cost) * qty;
  const paid = method === 'Tunai' ? Math.ceil(subtotal / 50000) * 50000 : subtotal;
  return {
    id, time: time.toISOString(), dateKey: localDateKey(time), dateLabel: new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(time),
    customer: 'Pelanggan contoh', paymentMethod: method, paid, change: Math.max(0, paid-subtotal), total: subtotal, subtotal, profit,
    items: [{ sku:p.sku, name:p.name, mode, qty, price, cost:p.cost, subtotal, profit }],
    origin: 'SAMPLE'
  };
}
function initialState() {
  const products = sourceCatalog.map(p => ({ ...clone(p), stock: p.sku === 'BB-polybag-15x15' ? 112 : p.sku === 'BB-polybag-20x20' ? 65 : p.sku === 'BB-cocopeat-1-kg' ? 26 : p.sku === 'BB-coco-chips-1-kg' ? 17 : p.sku === 'BB-benih-cabai-rawit-10g' ? 31 : p.sku === 'BB-benih-tomat-10g' ? 20 : 12 }));
  const transactions = [
    sampleTransaction('DEMO-0001', 0, 'BB-benih-cabai-rawit-10g', 2, 'online', 'Tunai', 9),
    sampleTransaction('DEMO-0002', -1, 'BB-polybag-15x15', 10, 'offline10', 'QRIS', 13),
    sampleTransaction('DEMO-0003', -3, 'BB-cocopeat-1-kg', 2, 'offline1', 'Tunai', 15),
    sampleTransaction('DEMO-0004', -5, 'BB-polybag-20x20', 5, 'offline10', 'QRIS', 11)
  ];
  return { products, transactions, nextNumber: 5, lastSync: null };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.products) || !Array.isArray(saved.transactions)) return initialState();
    return { ...initialState(), ...saved };
  } catch (error) {
    console.warn('KasirKu demo state could not be loaded:', error);
    return initialState();
  }
}
let state = loadState();
let cart = [];
let activeReceipt = null;
let editingSku = null;
let activeView = 'kasir';
let toastTimer = null;

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { showToast('Penyimpanan browser penuh atau tidak tersedia.'); console.error(error); }
}
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(date);
}
function timeLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
}
function getProduct(sku) { return state.products.find(product => product.sku === sku); }
function selectedPrice(product, mode) { return product ? product[priceModes[mode]?.field || 'onlinePrice'] : null; }
function productPriceAvailable(product, mode) {
  const value = selectedPrice(product, mode);
  return value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}
function cartTotal() { return cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0); }
function cartQuantity() { return cart.reduce((sum, line) => sum + line.qty, 0); }
function todayTransactions() { const today = localDateKey(); return state.transactions.filter(t => (t.dateKey || localDateKey(t.time)) === today); }

function showView(view) {
  if (!['kasir','stok','riwayat','analisis'].includes(view)) return;
  activeView = view;
  $$('.view').forEach(section => section.classList.toggle('active', section.id === `view-${view}`));
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const names = {kasir:'Kasir',stok:'Stok & Harga',riwayat:'Riwayat Transaksi',analisis:'Analisis Penjualan'};
  $('#crumb-title').textContent = names[view];
  $('#sidebar').classList.remove('open');
  if (view === 'analisis') renderAnalytics();
}

function renderSummary() {
  const today = todayTransactions();
  $('#today-revenue').textContent = money(today.reduce((sum,t)=>sum+t.total,0));
  $('#today-count').textContent = String(today.length);
  $('#today-profit').textContent = money(today.reduce((sum,t)=>sum+t.profit,0));
  $('#product-count').textContent = String(state.products.length);
  $('#history-revenue').textContent = money(state.transactions.reduce((sum,t)=>sum+t.total,0));
  $('#history-orders').textContent = String(state.transactions.length);
  $('#history-profit').textContent = money(state.transactions.reduce((sum,t)=>sum+t.profit,0));
  $('#history-count').textContent = `${state.transactions.length} transaksi`;
}
function renderCatalog() {
  const query = $('#product-search').value.trim().toLowerCase();
  const mode = $('#price-mode').value;
  const products = state.products.filter(p => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query));
  $('#catalog-count').textContent = `${products.length} produk`;
  $('#product-grid').innerHTML = products.map(p => {
    const available = productPriceAvailable(p, mode);
    const price = selectedPrice(p, mode);
    const disabled = p.stock <= 0 || !available;
    return `<button class="product-tile" type="button" data-add="${escapeHtml(p.sku)}" ${disabled ? 'disabled' : ''} aria-label="Tambah ${escapeHtml(p.name)} ke keranjang">
      <span class="product-top"><span class="product-icon">${escapeHtml(p.emoji || '▤')}</span><span class="product-source">${escapeHtml(p.source)}</span></span>
      <span class="product-name">${escapeHtml(p.name)}</span><span class="product-sku">${escapeHtml(p.sku)}</span>
      <span class="product-bottom"><b class="product-price">${available ? money(price) : 'Harga belum tersedia'}</b><small class="product-stock">Stok ${Number(p.stock)||0}</small></span>
    </button>`;
  }).join('');
  $('#product-empty').classList.toggle('hidden', products.length > 0);
}
function addToCart(sku) {
  const product = getProduct(sku);
  const mode = $('#price-mode').value;
  if (!product || !productPriceAvailable(product, mode)) return showToast('Harga untuk mode ini belum tersedia.');
  const currentQty = cart.filter(line => line.sku === sku).reduce((sum,line)=>sum+line.qty,0);
  if (currentQty >= product.stock) return showToast(`Stok ${product.name} tidak mencukupi.`);
  const existing = cart.find(line => line.sku === sku && line.mode === mode);
  if (existing) existing.qty += 1;
  else cart.push({ sku, mode, qty:1, unitPrice:Number(selectedPrice(product,mode)) });
  renderCart();
}
function renderCart() {
  const target = $('#cart-list');
  if (!cart.length) {
    target.innerHTML = '<div class="cart-empty"><span>＋</span><b>Keranjang masih kosong</b><small>Pilih produk untuk memulai transaksi.</small></div>';
  } else {
    target.innerHTML = cart.map((line,index) => {
      const product = getProduct(line.sku);
      const name = product ? product.name : line.sku;
      return `<div class="cart-line">
        <div><div class="cart-line-name">${escapeHtml(name)}</div><div class="cart-line-mode">${escapeHtml(priceModes[line.mode].label)}</div>
          <div class="cart-line-controls"><button class="qty-button" data-qty="-1" data-index="${index}" aria-label="Kurangi jumlah">−</button><span class="qty-value">${line.qty}</span><button class="qty-button" data-qty="1" data-index="${index}" aria-label="Tambah jumlah">+</button><button class="remove-line" data-remove="${index}">Hapus</button></div>
        </div>
        <div class="cart-price-box"><input class="cart-unit-price" type="number" min="0" step="1" value="${line.unitPrice}" data-price-index="${index}" aria-label="Edit harga satuan"><span class="cart-subtotal">${money(line.unitPrice * line.qty)}</span></div>
      </div>`;
    }).join('');
  }
  const total = cartTotal();
  $('#total-qty').textContent = `${cartQuantity()} pcs`;
  $('#order-total').textContent = money(total);
  $('#checkout-total').textContent = `${money(total)} →`;
  updatePaymentUI();
}
function updatePaymentUI() {
  const method = $('#payment-method').value;
  const total = cartTotal();
  const cashMode = method === 'Tunai';
  $('#cash-fields').classList.toggle('hidden', !cashMode);
  $('#payment-note').textContent = cashMode
    ? 'Masukkan nominal uang yang diterima. Sistem menghitung kembalian secara otomatis.'
    : 'QRIS hanya dicatat sebagai metode pembayaran demo. Tidak membuat QR dinamis atau memverifikasi pembayaran.';
  const paid = cashMode ? Number($('#cash-received').value || 0) : total;
  $('#change-due').textContent = cashMode ? money(Math.max(0,paid-total)) : '—';
  const validStock = cart.every(line => { const p=getProduct(line.sku); return p && p.stock >= cart.filter(x=>x.sku===line.sku).reduce((s,x)=>s+x.qty,0); });
  $('#checkout-button').disabled = !cart.length || total <= 0 || !validStock || (cashMode && paid < total);
}
function updateCartLinePrice(index, value) {
  const line = cart[index];
  const price = Number(value);
  if (!line || !Number.isFinite(price) || price < 0) { renderCart(); return showToast('Harga satuan tidak valid.'); }
  line.unitPrice = price;
  renderCart();
}
function checkout() {
  if (!cart.length) return;
  const method = $('#payment-method').value;
  const total = cartTotal();
  const paid = method === 'Tunai' ? Number($('#cash-received').value || 0) : total;
  if (method === 'Tunai' && paid < total) return showToast('Uang diterima kurang dari total transaksi.');
  const groupedQty = {};
  cart.forEach(line => groupedQty[line.sku] = (groupedQty[line.sku] || 0) + line.qty);
  const insufficient = Object.entries(groupedQty).find(([sku,qty]) => !getProduct(sku) || getProduct(sku).stock < qty);
  if (insufficient) return showToast('Stok tidak cukup. Periksa kembali keranjang.');

  const items = cart.map(line => {
    const p = getProduct(line.sku);
    const price = Number(line.unitPrice);
    const cost = Number(p.cost) || 0;
    const subtotal = price * line.qty;
    const profit = (price - cost) * line.qty;
    return { sku:p.sku, name:p.name, mode:line.mode, qty:line.qty, price, cost, subtotal, profit };
  });
  const now = new Date();
  const id = makeTransactionId(now);
  const profit = items.reduce((sum,item)=>sum+item.profit,0);
  const transaction = {
    id, time:now.toISOString(), dateKey:localDateKey(now), dateLabel:timeLabel(now),
    customer:$('#customer-name').value.trim() || 'Pelanggan umum', paymentMethod:method,
    paid, change:Math.max(0,paid-total), subtotal:total, total, profit, items, origin:'SIMULATION'
  };
  items.forEach(item => { const p=getProduct(item.sku); p.stock -= item.qty; });
  state.transactions.push(transaction);
  state.nextNumber = (Number(state.nextNumber) || 1) + 1;
  saveState();
  activeReceipt = transaction;
  cart = [];
  $('#customer-name').value = '';
  $('#cash-received').value = '';
  $('#payment-method').value = 'Tunai';
  renderAll();
  openReceipt(transaction);
  showToast(`Transaksi ${id} berhasil dicatat sebagai simulasi.`);
}
function makeTransactionId(date) {
  const stamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}-${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}${String(date.getSeconds()).padStart(2,'0')}`;
  return `KSR-${stamp}-${Math.floor(100+Math.random()*900)}`;
}

function renderStock() {
  const query = $('#stock-search').value.trim().toLowerCase();
  const products = state.products.filter(p => `${p.name} ${p.sku} ${p.source}`.toLowerCase().includes(query));
  $('#stock-count-label').textContent = `${products.length} dari ${state.products.length} produk dalam katalog demo.`;
  $('#stock-body').innerHTML = products.map(p => `<tr>
    <td><b>${escapeHtml(p.name)}</b><br><small>${escapeHtml(p.sku)}</small></td>
    <td><span class="source-tag">${escapeHtml(p.source)}</span></td>
    <td>${p.cost == null ? '—' : money(p.cost)}</td><td>${formatOptionalPrice(p.onlinePrice)}</td><td>${formatOptionalPrice(p.offline1)}</td><td>${formatOptionalPrice(p.offline10)}</td><td>${formatOptionalPrice(p.offline20)}</td>
    <td><span class="stock-number ${p.stock <= 5 ? 'low' : ''}">${Number(p.stock)||0}</span></td><td><button class="row-action" type="button" data-edit="${escapeHtml(p.sku)}">Atur</button></td>
  </tr>`).join('');
}
function formatOptionalPrice(value) { return value === null || value === '' || value === undefined ? '—' : money(value); }
function openProductEditor(sku) {
  const p = getProduct(sku);
  if (!p) return;
  editingSku = sku;
  $('#product-modal-title').textContent = 'Atur harga & stok';
  $('#modal-product-name').textContent = `${p.name} · ${p.sku} · Sumber: ${p.source}`;
  $('#modal-product-id').value = sku;
  $('#edit-cost').value = optionalInput(p.cost);
  $('#edit-online').value = optionalInput(p.onlinePrice);
  $('#edit-offline1').value = optionalInput(p.offline1);
  $('#edit-offline10').value = optionalInput(p.offline10);
  $('#edit-offline20').value = optionalInput(p.offline20);
  $('#restock-qty').value = '0';
  $('#product-feedback').textContent = `Stok saat ini: ${p.stock} pcs. Harga aktif yang telah diedit akan dipertahankan saat sinkronisasi.`;
  $('#product-modal').showModal();
}
function optionalInput(value) { return value === null || value === undefined ? '' : String(value); }
function parseOptionalPrice(value, label) {
  if (String(value).trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} harus angka 0 atau lebih.`);
  return parsed;
}
function saveProductEditor(event) {
  event.preventDefault();
  const p = getProduct(editingSku);
  if (!p) return;
  try {
    const prices = {
      cost:parseOptionalPrice($('#edit-cost').value,'HPP'),
      onlinePrice:parseOptionalPrice($('#edit-online').value,'Harga online'),
      offline1:parseOptionalPrice($('#edit-offline1').value,'Harga offline 1 pcs'),
      offline10:parseOptionalPrice($('#edit-offline10').value,'Harga offline 10 pcs'),
      offline20:parseOptionalPrice($('#edit-offline20').value,'Harga offline 20+ pcs')
    };
    const restock = Number($('#restock-qty').value || 0);
    if (!Number.isInteger(restock) || restock < 0) throw new Error('Tambah stok harus bilangan bulat 0 atau lebih.');
    Object.assign(p, prices);
    p.stock = (Number(p.stock)||0) + restock;
    saveState();
    $('#product-modal').close();
    renderAll();
    showToast('Harga aktif dan stok demo berhasil diperbarui.');
  } catch (error) { $('#product-feedback').textContent = error.message; }
}
function resetProductPrices() {
  const p = getProduct(editingSku);
  const source = sourceCatalog.find(item => item.sku === editingSku);
  if (!p || !source) return;
  Object.assign(p, { cost:source.cost, onlinePrice:source.onlinePrice, offline1:source.offline1, offline10:source.offline10, offline20:source.offline20 });
  $('#edit-cost').value = optionalInput(p.cost); $('#edit-online').value = optionalInput(p.onlinePrice);
  $('#edit-offline1').value = optionalInput(p.offline1); $('#edit-offline10').value = optionalInput(p.offline10); $('#edit-offline20').value = optionalInput(p.offline20);
  saveState();
  $('#product-feedback').textContent = 'Harga aktif demo telah dikembalikan ke nilai sumber contoh.';
  renderStock(); renderCatalog();
}
function syncCatalog() {
  let added = 0;
  sourceCatalog.forEach(source => {
    const active = getProduct(source.sku);
    if (!active) {
      state.products.push({ ...clone(source), stock:0 });
      added += 1;
      return;
    }
    // Meniru syncCatalogToStock_(): nama/sumber diperbarui; harga/HPP manual dipertahankan.
    active.name = source.name;
    active.category = source.category;
    active.source = source.source;
    active.emoji = source.emoji;
    ['cost','onlinePrice','offline1','offline10','offline20'].forEach(key => {
      if (active[key] === '' || active[key] === null || active[key] === undefined) active[key] = source[key];
    });
  });
  state.lastSync = new Date().toISOString();
  saveState(); renderAll();
  showToast(`Sinkronisasi katalog contoh selesai. ${added} produk baru ditambahkan; harga manual tetap dijaga.`);
}

function renderHistory() {
  const query = $('#history-search').value.trim().toLowerCase();
  const transactions = [...state.transactions].sort((a,b)=>new Date(b.time)-new Date(a.time)).filter(t=>`${t.id} ${t.customer} ${t.paymentMethod}`.toLowerCase().includes(query));
  $('#history-body').innerHTML = transactions.map(t => `<tr>
    <td><b>${escapeHtml(t.id)}</b><br><small><span class="source-tag">${t.origin === 'SAMPLE' ? 'CONTOH AWAL' : 'SIMULASI'}</span></small></td>
    <td>${escapeHtml(timeLabel(t.time))}</td><td>${escapeHtml(t.customer || 'Pelanggan umum')}</td>
    <td>${escapeHtml(t.paymentMethod === 'QRIS' ? 'QRIS (demo)' : 'Tunai')}</td><td><b>${money(t.total)}</b></td><td>${money(t.profit)}</td>
    <td><button class="row-action" type="button" data-open-receipt="${escapeHtml(t.id)}">Lihat struk</button></td>
  </tr>`).join('');
  $('#history-empty').classList.toggle('hidden', transactions.length > 0);
}

function getPeriodBounds() {
  const selected = $('#analytics-period').value;
  const today = new Date(); today.setHours(0,0,0,0);
  let start, end, previousStart, previousEnd;
  if (selected === 'tanggal') {
    const value = $('#analytics-date').value || localDateKey();
    const parts = value.split('-').map(Number);
    start = new Date(parts[0], parts[1]-1, parts[2]); end = new Date(start);
    previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate()-1);
    previousStart = new Date(previousEnd);
  } else if (selected === '7_hari') {
    end = new Date(today); start = new Date(today); start.setDate(start.getDate()-6);
    previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate()-1);
    previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate()-6);
  } else if (selected === '30_hari') {
    end = new Date(today); start = new Date(today); start.setDate(start.getDate()-29);
    previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate()-1);
    previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate()-29);
  } else {
    end = new Date(today); start = new Date(today);
    previousEnd = new Date(today); previousEnd.setDate(previousEnd.getDate()-1);
    previousStart = new Date(previousEnd);
  }
  const endExclusive = new Date(end); endExclusive.setDate(endExclusive.getDate()+1);
  const prevEndExclusive = new Date(previousEnd); prevEndExclusive.setDate(prevEndExclusive.getDate()+1);
  const key = d => localDateKey(d);
  let label;
  if (selected === 'hari_ini') label = `Hari ini · ${dateLabel(start)}`;
  else if (selected === 'tanggal') label = `Tanggal · ${dateLabel(start)}`;
  else label = `${dateLabel(start)} — ${dateLabel(end)}`;
  return { selected, start, end, endExclusive, previousStart, previousEnd, prevEndExclusive, label, startKey:key(start), endKey:key(end), prevStartKey:key(previousStart), prevEndKey:key(previousEnd) };
}
function transactionsInRange(startKey,endKey) {
  return state.transactions.filter(t => { const key=t.dateKey || localDateKey(t.time); return key >= startKey && key <= endKey; });
}
function summarizeTransactions(transactions) {
  const summary = { revenue:0, profit:0, orders:transactions.length, qty:0, average:0, products:{} };
  transactions.forEach(t => {
    summary.revenue += Number(t.total)||0;
    summary.profit += Number(t.profit)||0;
    (t.items || []).forEach(item => {
      const name = item.name || item.sku || 'Produk';
      if (!summary.products[name]) summary.products[name] = { name, qty:0, revenue:0 };
      summary.products[name].qty += Number(item.qty)||0;
      summary.products[name].revenue += Number(item.subtotal)||0;
      summary.qty += Number(item.qty)||0;
    });
  });
  summary.average = summary.orders ? summary.revenue / summary.orders : 0;
  summary.topProducts = Object.values(summary.products).sort((a,b)=>b.qty-a.qty).slice(0,5);
  return summary;
}
function compareText(current, previous) {
  if (previous === 0) return current > 0 ? 'Ada aktivitas pada periode ini' : 'Belum ada aktivitas';
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  const prefix = percent > 0 ? '↑' : percent < 0 ? '↓' : '•';
  return `${prefix} ${Math.abs(percent).toFixed(1).replace('.',',')}% dibanding periode sebelumnya`;
}
function renderAnalytics() {
  const selected = $('#analytics-period').value;
  $('#analytics-date-wrap').classList.toggle('hidden', selected !== 'tanggal');
  if (selected === 'tanggal' && !$('#analytics-date').value) $('#analytics-date').value = localDateKey();
  const bounds = getPeriodBounds();
  $('#analytics-range').textContent = bounds.label;
  const current = summarizeTransactions(transactionsInRange(bounds.startKey,bounds.endKey));
  const previous = summarizeTransactions(transactionsInRange(bounds.prevStartKey,localDateKey(bounds.previousEnd)));
  $('#metric-revenue').textContent = money(current.revenue);
  $('#metric-profit').textContent = money(current.profit);
  $('#metric-orders').textContent = String(current.orders);
  $('#metric-qty').textContent = String(current.qty);
  $('#metric-average').textContent = money(current.average);
  $('#metric-revenue-compare').textContent = compareText(current.revenue,previous.revenue);
  $('#metric-profit-compare').textContent = compareText(current.profit,previous.profit);
  $('#metric-orders-compare').textContent = compareText(current.orders,previous.orders);
  renderAnalyticsChart(bounds,current);
  renderTopProducts(current.topProducts);
}
function renderAnalyticsChart(bounds,summary) {
  const canvas = $('#sales-chart');
  const empty = $('#chart-empty');
  const isHourly = bounds.selected === 'hari_ini' || bounds.selected === 'tanggal';
  const labels = [];
  const values = {};
  if (isHourly) {
    for (let hour=0; hour<24; hour++) {
      const key = `${String(hour).padStart(2,'0')}:00`;
      labels.push(key); values[key]={revenue:0,profit:0};
    }
  } else {
    const cursor = new Date(bounds.start);
    while (cursor <= bounds.end) { const key=localDateKey(cursor); labels.push(key); values[key]={revenue:0,profit:0}; cursor.setDate(cursor.getDate()+1); }
  }
  transactionsInRange(bounds.startKey,bounds.endKey).forEach(t => {
    const date = new Date(t.time);
    const key = isHourly ? `${String(date.getHours()).padStart(2,'0')}:00` : (t.dateKey || localDateKey(t.time));
    if (values[key]) { values[key].revenue += Number(t.total)||0; values[key].profit += Number(t.profit)||0; }
  });
  const data = labels.map(label => ({label,revenue:values[label].revenue,profit:values[label].profit}));
  empty.classList.toggle('hidden', summary.orders > 0);
  canvas.classList.toggle('hidden', summary.orders === 0);
  if (!summary.orders) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1,window.devicePixelRatio||1);
  const width = Math.max(280,Math.floor(rect.width*dpr));
  const height = Math.max(180,Math.floor(rect.height*dpr));
  canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,width,height);
  const pad={left:58*dpr,right:14*dpr,top:15*dpr,bottom:35*dpr};
  const chartW=width-pad.left-pad.right, chartH=height-pad.top-pad.bottom;
  const max=Math.max(1,...data.map(d=>d.revenue));
  ctx.font=`${9*dpr}px Segoe UI, Arial`; ctx.textAlign='right'; ctx.textBaseline='middle';
  for(let i=0;i<=4;i++){
    const y=pad.top+(chartH*i/4); ctx.strokeStyle='#edf1f2';ctx.lineWidth=1*dpr;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.stroke();
    const value=max*(4-i)/4;ctx.fillStyle='#98a5aa';ctx.fillText(value>=1000000?`${(value/1000000).toFixed(1)}jt`:value>=1000?`${Math.round(value/1000)}rb`:String(Math.round(value)),pad.left-8*dpr,y);
  }
  const step=chartW/data.length; const barW=Math.max(3*dpr,Math.min(21*dpr,step*.55));
  data.forEach((d,index)=>{const barH=(d.revenue/max)*chartH;const x=pad.left+index*step+(step-barW)/2;ctx.fillStyle='#72bdae';ctx.beginPath();ctx.roundRect(x,pad.top+chartH-barH,barW,Math.max(2*dpr,barH),4*dpr);ctx.fill();});
  ctx.beginPath();ctx.strokeStyle='#5d82b8';ctx.lineWidth=2*dpr;ctx.lineJoin='round';
  data.forEach((d,index)=>{const x=pad.left+index*step+step/2;const y=pad.top+chartH-(d.profit/max)*chartH;if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
  data.forEach((d,index)=>{if(isHourly ? index%3!==0 && index!==23 : data.length>10 && index%Math.ceil(data.length/8)!==0 && index!==data.length-1)return;const x=pad.left+index*step+step/2;ctx.fillStyle='#87969d';ctx.textAlign='center';ctx.textBaseline='top';ctx.font=`${8*dpr}px Segoe UI, Arial`;const label=isHourly?d.label.slice(0,2):d.label.slice(5);ctx.fillText(label,x,height-25*dpr);});
}
function renderTopProducts(products) {
  $('#top-products').innerHTML = products.map((p,index)=>`<div class="top-product"><span class="rank-badge">${index+1}</span><span class="top-product-name"><b>${escapeHtml(p.name)}</b><small>${p.qty} pcs terjual</small></span><strong>${money(p.revenue)}</strong></div>`).join('');
  $('#top-empty').classList.toggle('hidden',products.length>0);
}

function openReceipt(transaction) {
  if (!transaction) return;
  activeReceipt = transaction;
  $('#receipt-shop-name').textContent = 'KasirKu Demo';
  $('#receipt-meta').innerHTML = `ID transaksi: <b>${escapeHtml(transaction.id)}</b><br>Tanggal: ${escapeHtml(timeLabel(transaction.time))}<br>Pelanggan: ${escapeHtml(transaction.customer || 'Pelanggan umum')}<br>Metode: ${escapeHtml(transaction.paymentMethod === 'QRIS' ? 'QRIS (simulasi)' : 'Tunai')}<br>Status: DATA SIMULASI`;
  $('#receipt-items').innerHTML = (transaction.items||[]).map(item=>`<div class="receipt-item"><span>${escapeHtml(item.name)}<br><small>${item.qty} × ${money(item.price)} · ${escapeHtml(priceModes[item.mode]?.label||item.mode)}</small></span><b>${money(item.subtotal)}</b></div>`).join('');
  $('#receipt-summary').innerHTML = `Subtotal <b style="float:right">${money(transaction.subtotal)}</b><br>HPP barang <b style="float:right">${money(transaction.subtotal-transaction.profit)}</b><br>Laba kotor <b style="float:right">${money(transaction.profit)}</b>${transaction.paymentMethod==='Tunai'?`<br>Uang diterima <b style="float:right">${money(transaction.paid)}</b><br>Kembalian <b style="float:right">${money(transaction.change)}</b>`:''}<strong>Total pembayaran <b style="float:right">${money(transaction.total)}</b></strong>`;
  $('#receipt-phone').value='';
  $('#receipt-modal').showModal();
}
function sendReceiptWhatsApp() {
  if (!activeReceipt) return;
  let phone = $('#receipt-phone').value.replace(/[^0-9]/g,'');
  if (!phone) return showToast('Masukkan nomor WhatsApp pelanggan terlebih dahulu.');
  if (phone.startsWith('0')) phone = '62' + phone.slice(1);
  const t=activeReceipt;
  const lines=(t.items||[]).map(item=>`- ${item.name} (${item.qty} x ${money(item.price)}) = ${money(item.subtotal)}`).join('\n');
  const message=`STRUK KASIRKU DEMO\nID: ${t.id}\nWaktu: ${timeLabel(t.time)}\n${lines}\nTotal: ${money(t.total)}\nMetode: ${t.paymentMethod==='QRIS'?'QRIS (SIMULASI)':'Tunai'}\n\nCatatan: ini struk demonstrasi, bukan bukti pembayaran sungguhan.`;
  const url=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url,'_blank','noopener,noreferrer');
}

function resetDemo() {
  if (!confirm('Reset akan mengembalikan produk, stok, harga, dan riwayat ke data contoh awal. Perubahan demo saat ini akan hilang. Lanjutkan?')) return;
  state=initialState(); cart=[]; saveState(); renderAll(); showView('kasir'); showToast('Data demo dikembalikan ke kondisi awal.');
}
function renderAll() {
  renderCatalog(); renderCart(); renderStock(); renderHistory(); renderSummary();
  if (activeView==='analisis') renderAnalytics();
  $('#order-number').textContent = `#KSR-${String(state.nextNumber||1).padStart(6,'0')}`;
}
function bindEvents() {
  $$('.nav-item').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
  $('#product-grid').addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(button)addToCart(button.dataset.add);});
  $('#product-search').addEventListener('input',renderCatalog);
  $('#price-mode').addEventListener('change',renderCatalog);
  $('#cart-list').addEventListener('click',event=>{
    const quantityButton=event.target.closest('[data-qty]'); const removeButton=event.target.closest('[data-remove]');
    if(quantityButton){const index=Number(quantityButton.dataset.index);const line=cart[index];if(!line)return;const p=getProduct(line.sku);const totalForSku=cart.filter(x=>x.sku===line.sku).reduce((s,x)=>s+x.qty,0);const delta=Number(quantityButton.dataset.qty);if(delta>0&&p&&totalForSku>=p.stock)return showToast('Stok tidak mencukupi.');line.qty+=delta;if(line.qty<=0)cart.splice(index,1);renderCart();}
    if(removeButton){cart.splice(Number(removeButton.dataset.remove),1);renderCart();}
  });
  $('#cart-list').addEventListener('change',event=>{const input=event.target.closest('[data-price-index]');if(input)updateCartLinePrice(Number(input.dataset.priceIndex),input.value);});
  $('#clear-cart').addEventListener('click',()=>{cart=[];$('#customer-name').value='';$('#cash-received').value='';renderCart();});
  $('#payment-method').addEventListener('change',updatePaymentUI);
  $('#cash-received').addEventListener('input',updatePaymentUI);
  $('#checkout-button').addEventListener('click',checkout);
  $('#stock-search').addEventListener('input',renderStock);
  $('#stock-body').addEventListener('click',event=>{const button=event.target.closest('[data-edit]');if(button)openProductEditor(button.dataset.edit);});
  $('#sync-catalog').addEventListener('click',syncCatalog);
  $('#product-form').addEventListener('submit',saveProductEditor);
  $('#reset-source-price').addEventListener('click',resetProductPrices);
  $('#history-search').addEventListener('input',renderHistory);
  $('#history-body').addEventListener('click',event=>{const button=event.target.closest('[data-open-receipt]');if(button){const t=state.transactions.find(item=>item.id===button.dataset.openReceipt);openReceipt(t);}});
  $('#analytics-period').addEventListener('change',renderAnalytics);
  $('#analytics-date').addEventListener('change',renderAnalytics);
  $('#reset-demo').addEventListener('click',resetDemo);
  $('#dismiss-banner').addEventListener('click',()=>$('.demo-banner').classList.add('hidden'));
  $('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>$('#'+button.dataset.close).close()));
  $('#print-receipt').addEventListener('click',()=>window.print());
  $('#send-receipt-wa').addEventListener('click',sendReceiptWhatsApp);
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showView('kasir');$('#product-search').focus();}});
  window.addEventListener('resize',()=>{if(activeView==='analisis')renderAnalyticsChart(getPeriodBounds(),summarizeTransactions(transactionsInRange(getPeriodBounds().startKey,getPeriodBounds().endKey)));});
}

function init() {
  $('#today-label').textContent=dateLabel();
  if (!$('#analytics-date').value) $('#analytics-date').value=localDateKey();
  bindEvents(); renderAll();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker demo skipped:',error));
  }
}
init();
