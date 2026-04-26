// MangoBerryEstate booking + payment script

const PRICES = {
  mango: 1100,
  litchi: 1100,
  veggies: 1100,
  basket: 2000,         // Pick 2 varieties
  'basket-deluxe': 3000, // Pick all 3 varieties
};

const EXPERIENCE_NAMES = {
  mango: 'Mango Picking',
  litchi: 'Litchi Picking',
  veggies: 'Seasonal Vegetable Picking',
  basket: 'MangoBerry Premium Basket — Pick 2 varieties',
  'basket-deluxe': 'MangoBerry Premium Basket — Pick all 3 varieties',
};

// Demo merchant UPI ID — replace with your real one in production
const MERCHANT_UPI = 'mangoberryestate@upi';
const MERCHANT_NAME = 'MangoBerryEstate';

const form = document.getElementById('booking-form');
const pickersEl = document.getElementById('nights');     // reused id
const rateEl = document.getElementById('rate');
const taxEl = document.getElementById('tax');
const totalEl = document.getElementById('total');

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalAmount = document.getElementById('modal-amount');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');

document.getElementById('year').textContent = new Date().getFullYear();

// Default visit date = tomorrow
(function setDefaultDate() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  form.visitdate.min = today.toISOString().split('T')[0];
  form.visitdate.value = tomorrow.toISOString().split('T')[0];
})();

// Card click → select experience in form
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    const experience = card.dataset.experience;
    form.experience.value = experience;
    updateSummary();
    document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
  });
});

function inr(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function calc() {
  const experience = form.experience.value;
  const pickers = parseInt(form.pickers.value, 10);
  if (!experience || !pickers || pickers < 1) return null;
  const rate = PRICES[experience];
  if (!rate) return null;
  const subtotal = rate * pickers;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;
  return { pickers, rate, subtotal, fee, total, experience };
}

function updateSummary() {
  const c = calc();
  if (!c) {
    pickersEl.textContent = '—';
    rateEl.textContent = '—';
    taxEl.textContent = '—';
    totalEl.textContent = '—';
    return;
  }
  pickersEl.textContent = c.pickers;
  rateEl.textContent = `${inr(c.rate)} × ${c.pickers} = ${inr(c.subtotal)}`;
  taxEl.textContent = inr(c.fee);
  totalEl.textContent = inr(c.total);
}

function toggleBasketOptions() {
  const pickRow = document.getElementById('basket-pick-row');
  const exp = form.experience.value;
  const isBasket = exp === 'basket';            // Pick 2 varieties → ask which 2
  const isAnyBasket = isBasket || exp === 'basket-deluxe';
  if (pickRow) pickRow.hidden = !isBasket;
  // Pickers field re-labels itself in basket mode (per-basket instead of per-picker)
  const pickersLabel = form.pickers.closest('label')?.querySelector('span');
  if (pickersLabel) pickersLabel.textContent = isAnyBasket ? 'Baskets' : 'Pickers';
}

['change', 'input'].forEach(evt => {
  form.addEventListener(evt, () => {
    toggleBasketOptions();
    updateSummary();
  });
});

toggleBasketOptions();

// Build UPI deep link (works on mobile to launch any UPI app)
function buildUpiLink(amount, txnNote, pa) {
  const params = new URLSearchParams({
    pa: pa || MERCHANT_UPI,
    pn: MERCHANT_NAME,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: txnNote,
  });
  return 'upi://pay?' + params.toString();
}

function qrSvg(text) {
  return `
    <div class="qr-box">
      <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" aria-label="QR placeholder">
        <rect width="180" height="180" fill="#fff"/>
        ${generateFakeQr(text)}
        <rect x="78" y="78" width="24" height="24" fill="#fff"/>
        <text x="90" y="96" text-anchor="middle" font-size="12" font-family="serif" fill="#8b1e3f" font-weight="700">🥭</text>
      </svg>
    </div>
  `;
}

function generateFakeQr(seed) {
  // Deterministic pseudo-random pattern for demo visual
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let cells = '';
  const N = 18;
  const s = 180 / N;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      h = (h * 1103515245 + 12345) >>> 0;
      if ((h & 1) && !(x < 4 && y < 4) && !(x > N-5 && y < 4) && !(x < 4 && y > N-5)) {
        cells += `<rect x="${x*s}" y="${y*s}" width="${s}" height="${s}" fill="#2a1a14"/>`;
      }
    }
  }
  const m = (cx, cy) => `
    <rect x="${cx}" y="${cy}" width="${s*3}" height="${s*3}" fill="#2a1a14"/>
    <rect x="${cx+s*0.5}" y="${cy+s*0.5}" width="${s*2}" height="${s*2}" fill="#fff"/>
    <rect x="${cx+s}" y="${cy+s}" width="${s}" height="${s}" fill="#2a1a14"/>
  `;
  return cells + m(0,0) + m((N-3)*s,0) + m(0,(N-3)*s);
}

function openModal(method, amount, bookingId) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modalAmount.textContent = inr(amount);

  const note = `Slot ${bookingId}`;
  const upiLink = buildUpiLink(amount, note);

  if (method === 'upi') {
    modalTitle.textContent = 'Scan with any UPI app';
    modalBody.innerHTML = `
      ${qrSvg(upiLink)}
      <p>or pay to UPI ID</p>
      <div class="upi-id">${MERCHANT_UPI}</div>
      <br/>
      <a class="pay-link-btn" href="${upiLink}">Open UPI app</a>
    `;
  } else if (method === 'paytm') {
    const paytmLink = buildUpiLink(amount, note, 'mangoberryestate@paytm');
    modalTitle.textContent = 'Pay with Paytm';
    modalBody.innerHTML = `
      ${qrSvg(paytmLink)}
      <p>Scan with Paytm, or pay to</p>
      <div class="upi-id">mangoberryestate@paytm</div>
      <br/>
      <a class="pay-link-btn" href="${paytmLink}">Open Paytm</a>
    `;
  } else if (method === 'gpay') {
    const gpayLink = buildUpiLink(amount, note, 'mangoberryestate@okhdfcbank');
    modalTitle.textContent = 'Pay with Google Pay';
    modalBody.innerHTML = `
      ${qrSvg(gpayLink)}
      <p>Scan with Google Pay, or pay to</p>
      <div class="upi-id">mangoberryestate@okhdfcbank</div>
      <br/>
      <a class="pay-link-btn" href="${gpayLink}">Open Google Pay</a>
    `;
  }
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const c = calc();
  if (!c) {
    alert('Please pick an experience and number of pickers.');
    return;
  }
  const method = form.payment.value;
  const bookingId = 'MB' + Date.now().toString().slice(-8);
  openModal(method, c.total, bookingId);
});

updateSummary();
