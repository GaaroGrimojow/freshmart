/**
 * FreshMart Grocery Storefront — Frontend Application Logic
 * Integrates with Node.js/Express API (Port 5000) and Python FastAPI (Port 8000)
 */

// Configuration
const API_BASE = window.location.protocol.startsWith('http') 
  ? window.location.origin 
  : 'http://localhost:5000';

const PYTHON_API_BASE = window.location.protocol.startsWith('http') 
  ? window.location.origin 
  : 'http://localhost:5000';

// State
let allProducts = [];
let currentCategory = 'All';
let searchQuery = '';
let currentSort = 'default';
let cart = JSON.parse(localStorage.getItem('freshmart_cart') || '{}');
let appliedCoupon = null; // { code: 'FRESH50', discount: 50 }

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const emptyProducts = document.getElementById('empty-products');
const catalogTitle = document.getElementById('catalog-title');
const itemsCountBadge = document.getElementById('items-count-badge');
const categoryChips = document.getElementById('category-chips');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const sortSelect = document.getElementById('sort-select');

// Cart & Drawer DOM
const cartTriggerBtn = document.getElementById('cart-trigger-btn');
const cartDrawer = document.getElementById('cart-drawer');
const cartBackdrop = document.getElementById('cart-backdrop');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsList = document.getElementById('cart-items-list');
const cartCounter = document.getElementById('cart-counter');
const cartTotalBadge = document.getElementById('cart-total-badge');
const drawerItemCount = document.getElementById('drawer-item-count');
const billSubtotal = document.getElementById('bill-subtotal');
const billDelivery = document.getElementById('bill-delivery');
const billDiscount = document.getElementById('bill-discount');
const discountRow = document.getElementById('discount-row');
const billTotal = document.getElementById('bill-total');
const ctaTotalBadge = document.getElementById('cta-total-badge');
const checkoutCtaBtn = document.getElementById('checkout-cta-btn');
const meterText = document.getElementById('meter-text');
const meterFill = document.getElementById('meter-fill');
const couponInput = document.getElementById('coupon-input');
const applyCouponBtn = document.getElementById('apply-coupon-btn');
const couponMessage = document.getElementById('coupon-message');

// Checkout Modal DOM
const checkoutModal = document.getElementById('checkout-modal');
const checkoutBackdrop = document.getElementById('checkout-backdrop');
const closeCheckoutBtn = document.getElementById('close-checkout-btn');
const cancelCheckoutBtn = document.getElementById('cancel-checkout-btn');
const checkoutForm = document.getElementById('checkout-form');
const placeOrderBtn = document.getElementById('place-order-btn');
const btnSpinner = document.getElementById('btn-spinner');
const modalItemCount = document.getElementById('modal-item-count');
const modalGrandTotal = document.getElementById('modal-grand-total');

// Order Success Modal DOM
const successModal = document.getElementById('success-modal');
const successBackdrop = document.getElementById('success-backdrop');
const receiptOrderId = document.getElementById('receipt-order-id');
const receiptCustomerName = document.getElementById('receipt-customer-name');
const receiptAddress = document.getElementById('receipt-address');
const receiptPayment = document.getElementById('receipt-payment');
const receiptTotal = document.getElementById('receipt-total');

// System Banner
const systemBanner = document.getElementById('system-banner');
const bannerText = document.getElementById('banner-text');

// Reports Modal
const reportsNavBtn = document.getElementById('reports-nav-btn');
const reportsModal = document.getElementById('reports-modal');
const reportsBackdrop = document.getElementById('reports-backdrop');
const closeReportsBtn = document.getElementById('close-reports-btn');
const reportsContentArea = document.getElementById('reports-content-area');

const CATEGORY_META = {
  'All': { icon: '🛒', label: 'All Groceries' },
  'Fruits': { icon: '🍎', label: 'Fresh Fruits' },
  'Vegetables': { icon: '🥦', label: 'Vegetables' },
  'Dairy': { icon: '🥛', label: 'Dairy & Milk' },
  'Bakery': { icon: '🍞', label: 'Bakery & Breads' },
  'Beverages': { icon: '🥤', label: 'Drinks & Beverages' },
  'Snacks': { icon: '🍿', label: 'Snacks & Munchies' },
  'Pantry': { icon: '🌾', label: 'Pantry & Staples' },
  'Spices & Condiments': { icon: '🧂', label: 'Spices & Condiments' },
  'Frozen Foods': { icon: '❄️', label: 'Frozen Foods' },
  'Household': { icon: '🧼', label: 'Household & Cleaning' },
  'Fruits & Vegetables': { icon: '🍎', label: 'Fruits & Veggies' },
  'Dairy & Breakfast': { icon: '🥛', label: 'Dairy & Breakfast' },
  'Staples & Grains': { icon: '🌾', label: 'Staples & Grains' },
  'Spices & Oils': { icon: '🫒', label: 'Spices & Oils' },
  'Snacks & Beverages': { icon: '☕', label: 'Snacks & Beverages' }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkBackendHealth();
  loadCategoryChips();
  fetchProducts();
  updateCartUI();
  startDealsTimer();
  setupSearchDropdown();
  setupLocationModal();
});

// ==========================================
// Dynamic Category Chips & Featured Track
// ==========================================
async function loadCategoryChips() {
  const featuredTrack = document.getElementById('featured-categories-track');
  try {
    const res = await fetch(`${API_BASE}/api/products/categories`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.categories || data.categories.length === 0) return;

    const totalCount = data.total || data.categories.reduce((acc, c) => acc + parseInt(c.count, 10), 0);

    // 1. Sticky Bar Chips
    if (categoryChips) {
      let html = `
        <button class="chip-btn ${currentCategory === 'All' ? 'active' : ''}" data-category="All">
          <span class="chip-icon">🛒</span>
          <span class="chip-title">All Groceries</span>
          <span class="chip-count">${totalCount}</span>
        </button>
      `;

      data.categories.forEach(cat => {
        const meta = CATEGORY_META[cat.category] || { icon: '📦', label: cat.category };
        const isActive = currentCategory === cat.category;
        html += `
          <button class="chip-btn ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat.category)}">
            <span class="chip-icon">${meta.icon}</span>
            <span class="chip-title">${escapeHtml(cat.category)}</span>
            <span class="chip-count">${cat.count}</span>
          </button>
        `;
      });

      categoryChips.innerHTML = html;
    }

    // 2. Featured Category Story Track Cards
    if (featuredTrack) {
      let trackHtml = `
        <div class="category-card-item ${currentCategory === 'All' ? 'active' : ''}" onclick="selectCategory('All')">
          <div class="category-card-icon-wrap">🛒</div>
          <div class="category-card-name">All Items</div>
          <span class="category-card-badge">${totalCount} items</span>
        </div>
      `;

      data.categories.forEach(cat => {
        const meta = CATEGORY_META[cat.category] || { icon: '📦', label: cat.category };
        const isActive = currentCategory === cat.category;
        trackHtml += `
          <div class="category-card-item ${isActive ? 'active' : ''}" onclick="selectCategory('${escapeHtml(cat.category)}')">
            <div class="category-card-icon-wrap">${meta.icon}</div>
            <div class="category-card-name">${escapeHtml(cat.category)}</div>
            <span class="category-card-badge">${cat.count} items</span>
          </div>
        `;
      });

      featuredTrack.innerHTML = trackHtml;
    }
  } catch (err) {
    console.warn('Could not load dynamic category chips:', err);
  }
}

// ==========================================
// System Health & Diagnostics
// ==========================================
async function checkBackendHealth() {
  bannerText.textContent = 'Checking FreshMart PostgreSQL backend connection...';
  systemBanner.className = 'system-banner checking';

  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data.database && data.database.connected) {
      systemBanner.className = 'system-banner connected';
      bannerText.innerHTML = `🟢 <strong>Live & Connected:</strong> PostgreSQL database <em>"${data.database.database}"</em> active.`;
    } else {
      systemBanner.className = 'system-banner warning';
      bannerText.innerHTML = `⚠️ <strong>Database Alert:</strong> Node API is running, but PostgreSQL connection failed: ${data.database?.error || 'Check credentials'}.`;
    }
  } catch (err) {
    systemBanner.className = 'system-banner warning';
    bannerText.innerHTML = `⚠️ <strong>Backend Offline:</strong> Ensure Node.js server is started on port 5000 (<code>npm run dev</code>).`;
  }
}

// ==========================================
// Product Fetching & Rendering
// ==========================================
async function fetchProducts() {
  productsGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
      <p style="font-size: 1.2rem;">🥬 Loading farm-fresh products from PostgreSQL database...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (currentCategory !== 'All') params.append('category', currentCategory);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (currentSort !== 'default') params.append('sort', currentSort);

    const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
    if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    
    const data = await res.json();
    allProducts = data.products || [];
    renderProducts(allProducts);
  } catch (err) {
    console.error('Failed to load products from API:', err);
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; background: white; border-radius: 16px; border: 1.5px dashed #cbd5e1;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔌</div>
        <h3 style="font-family: Outfit; font-size: 1.4rem; color: #0f172a; margin-bottom: 8px;">Waiting for PostgreSQL Database Connection</h3>
        <p style="color: #64748b; max-width: 500px; margin: 0 auto 18px;">
          Make sure your PostgreSQL database is connected and the FreshMart server is active.
        </p>
        <button class="primary-btn" onclick="checkBackendHealth(); fetchProducts();">Retry Connection</button>
      </div>
    `;
    itemsCountBadge.textContent = 'Offline';
  }
}

function renderProducts(products) {
  if (!products || products.length === 0) {
    productsGrid.style.display = 'none';
    emptyProducts.style.display = 'block';
    itemsCountBadge.textContent = '0 items';
    return;
  }

  productsGrid.style.display = 'grid';
  emptyProducts.style.display = 'none';
  itemsCountBadge.textContent = `${products.length} item${products.length > 1 ? 's' : ''}`;
  const meta = CATEGORY_META[currentCategory];
  const icon = meta ? meta.icon : '🛒';
  catalogTitle.innerHTML = currentCategory === 'All' ? '🛒 All Groceries' : `${icon} ${escapeHtml(currentCategory)}`;

  productsGrid.innerHTML = products.map(product => {
    const cartQty = cart[product.id]?.quantity || 0;
    const price = parseFloat(product.price).toFixed(2);
    const mrp = (parseFloat(product.price) * 1.15).toFixed(2); // Simulated MRP

    return `
      <article class="product-card" id="product-${product.id}">
        <div class="product-image-wrap" style="position:relative; cursor:pointer;" onclick="openQuickView(${product.id})">
          <img 
            src="${product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}" 
            alt="${escapeHtml(product.name)}" 
            class="product-img"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'"
          >
          ${product.badge ? `<span class="product-badge ${product.badge.toLowerCase().includes('best') ? 'bestseller' : 'organic'}">${product.badge}</span>` : ''}
          <span class="rating-pill">⭐ ${product.rating || '4.8'}</span>
          <span class="product-discount-tag">15% OFF</span>
          <button class="quickview-trigger" onclick="event.stopPropagation(); openQuickView(${product.id});" title="Quick View">👁️</button>
        </div>

        <div class="product-info">
          <span class="product-category">${product.category}</span>
          <h3 class="product-title" title="${escapeHtml(product.name)}" style="cursor:pointer;" onclick="openQuickView(${product.id})">${escapeHtml(product.name)}</h3>
          <span class="product-unit">${product.unit}</span>

          <div class="product-bottom-row">
            <div class="price-box">
              <span class="product-price">₹${price}</span>
              <span class="product-mrp">₹${mrp}</span>
            </div>

            <div class="btn-wrap" id="btn-wrap-${product.id}">
              ${cartQty > 0 
                ? `
                  <div class="qty-control-group">
                    <button class="qty-btn" onclick="decrementProduct(${product.id})" aria-label="Decrease quantity">−</button>
                    <span class="qty-number">${cartQty}</span>
                    <button class="qty-btn" onclick="incrementProduct(${product.id})" aria-label="Increase quantity">+</button>
                  </div>
                `
                : `
                  <button class="add-btn" onclick="addToCart(${product.id})" id="add-btn-${product.id}">
                    + ADD
                  </button>
                `
              }
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================
// Cart Operations
// ==========================================
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  if (cart[productId]) {
    cart[productId].quantity += 1;
  } else {
    cart[productId] = {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      unit: product.unit,
      image_url: product.image_url,
      quantity: 1,
      stock: product.stock_quantity || 100
    };
  }

  saveCart();
  updateCartUI();
  updateCardButtons(productId);
  showToast(`Added "${product.name}" to basket!`, 'success');
}

function incrementProduct(productId) {
  if (cart[productId]) {
    cart[productId].quantity += 1;
    saveCart();
    updateCartUI();
    updateCardButtons(productId);
  }
}

function decrementProduct(productId) {
  if (cart[productId]) {
    cart[productId].quantity -= 1;
    if (cart[productId].quantity <= 0) {
      delete cart[productId];
      showToast('Item removed from basket', 'info');
    }
    saveCart();
    updateCartUI();
    updateCardButtons(productId);
  }
}

function removeCartItem(productId) {
  if (cart[productId]) {
    delete cart[productId];
    saveCart();
    updateCartUI();
    updateCardButtons(productId);
    showToast('Item removed', 'info');
  }
}

function updateCardButtons(productId) {
  const btnWrap = document.getElementById(`btn-wrap-${productId}`);
  if (!btnWrap) return;

  const cartQty = cart[productId]?.quantity || 0;
  if (cartQty > 0) {
    btnWrap.innerHTML = `
      <div class="qty-control-group">
        <button class="qty-btn" onclick="decrementProduct(${productId})" aria-label="Decrease quantity">−</button>
        <span class="qty-number">${cartQty}</span>
        <button class="qty-btn" onclick="incrementProduct(${productId})" aria-label="Increase quantity">+</button>
      </div>
    `;
  } else {
    btnWrap.innerHTML = `
      <button class="add-btn" onclick="addToCart(${productId})" id="add-btn-${productId}">
        + ADD
      </button>
    `;
  }
}

function saveCart() {
  localStorage.setItem('freshmart_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const items = Object.values(cart);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Delivery fee logic: Free delivery if subtotal >= 499, else 40 (only if items > 0)
  const deliveryFee = totalCount === 0 ? 0 : (subtotal >= 499 ? 0 : 40);

  // Coupon discount
  let discount = 0;
  if (appliedCoupon && subtotal >= 299) {
    discount = appliedCoupon.discount;
    discountRow.style.display = 'flex';
    billDiscount.textContent = `-₹${discount.toFixed(2)}`;
  } else {
    discountRow.style.display = 'none';
  }

  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

  // Update Header Badges
  cartCounter.textContent = totalCount;
  cartTotalBadge.textContent = `₹${subtotal.toFixed(2)}`;
  drawerItemCount.textContent = `${totalCount} item${totalCount !== 1 ? 's' : ''}`;

  // Update Drawer Bill Breakdown
  billSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
  billDelivery.textContent = deliveryFee === 0 ? (totalCount === 0 ? '₹0.00' : 'FREE') : `₹${deliveryFee.toFixed(2)}`;
  billTotal.textContent = `₹${grandTotal.toFixed(2)}`;
  ctaTotalBadge.textContent = `₹${grandTotal.toFixed(2)} →`;

  // Update Floating Bottom Cart Bar
  const floatingCartBar = document.getElementById('floating-cart-bar');
  const floatingCartItems = document.getElementById('floating-cart-items');
  const floatingCartTotal = document.getElementById('floating-cart-total');
  if (floatingCartBar) {
    if (totalCount > 0) {
      floatingCartBar.style.display = 'block';
      if (floatingCartItems) floatingCartItems.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
      if (floatingCartTotal) floatingCartTotal.textContent = `₹${subtotal.toFixed(2)}`;
    } else {
      floatingCartBar.style.display = 'none';
    }
  }

  // Free Delivery Meter
  if (subtotal >= 499 || totalCount === 0) {
    meterText.innerHTML = totalCount === 0 
      ? 'Add ₹499 more for <strong>FREE Delivery</strong>' 
      : '🎉 You have unlocked <strong>FREE Express Delivery!</strong>';
    meterFill.style.width = totalCount === 0 ? '0%' : '100%';
  } else {
    const remaining = (499 - subtotal).toFixed(2);
    const percent = Math.min(100, Math.round((subtotal / 499) * 100));
    meterText.innerHTML = `Add <strong>₹${remaining}</strong> more for <strong>FREE Delivery</strong>`;
    meterFill.style.width = `${percent}%`;
  }

  // Render Items in Cart Drawer
  if (items.length === 0) {
    cartItemsList.innerHTML = `
      <div class="cart-empty-state">
        <div class="icon">🧺</div>
        <h4>Your basket is empty</h4>
        <p>Explore our fresh produce and grocery items to start shopping!</p>
      </div>
    `;
    checkoutCtaBtn.disabled = true;
    checkoutCtaBtn.style.opacity = '0.6';
    checkoutCtaBtn.style.cursor = 'not-allowed';
  } else {
    checkoutCtaBtn.disabled = false;
    checkoutCtaBtn.style.opacity = '1';
    checkoutCtaBtn.style.cursor = 'pointer';

    cartItemsList.innerHTML = items.map(item => `
      <div class="cart-item-card" id="cart-item-${item.id}">
        <img 
          src="${item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}" 
          alt="${escapeHtml(item.name)}" 
          class="cart-item-img"
        >
        <div class="cart-item-details">
          <div>
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-item-unit">${item.unit}</div>
          </div>
          <div class="cart-item-bottom">
            <span class="cart-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
            <div class="qty-control-group">
              <button class="qty-btn" onclick="decrementProduct(${item.id})">−</button>
              <span class="qty-number">${item.quantity}</span>
              <button class="qty-btn" onclick="incrementProduct(${item.id})">+</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// ==========================================
// Coupon Code
// ==========================================
applyCouponBtn.addEventListener('click', () => {
  const code = couponInput.value.trim().toUpperCase();
  const subtotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (code === 'FRESH50') {
    if (subtotal < 299) {
      couponMessage.className = 'coupon-message error';
      couponMessage.textContent = 'FRESH50 requires a minimum order of ₹299.';
      appliedCoupon = null;
    } else {
      appliedCoupon = { code: 'FRESH50', discount: 50.00 };
      couponMessage.className = 'coupon-message success';
      couponMessage.textContent = '🎉 Coupon FRESH50 applied! ₹50 saved.';
    }
  } else {
    couponMessage.className = 'coupon-message error';
    couponMessage.textContent = 'Invalid coupon code. Try FRESH50.';
    appliedCoupon = null;
  }
  updateCartUI();
});

// ==========================================
// Checkout Flow
// ==========================================
checkoutCtaBtn.addEventListener('click', () => {
  if (Object.keys(cart).length === 0) return;
  closeCart();
  openCheckout();
});

function openCheckout() {
  const items = Object.values(cart);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const discount = (appliedCoupon && subtotal >= 299) ? appliedCoupon.discount : 0;
  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

  modalItemCount.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
  modalGrandTotal.textContent = `₹${grandTotal.toFixed(2)}`;

  checkoutModal.classList.add('open');
  checkoutBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  checkoutModal.classList.remove('open');
  checkoutBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

// Payment method selection visual style
document.querySelectorAll('.payment-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const customerName = document.getElementById('cust-name').value.trim();
  const customerPhone = document.getElementById('cust-phone').value.trim();
  const customerEmail = document.getElementById('cust-email').value.trim();
  const customerAddress = document.getElementById('cust-address').value.trim();
  const customerCity = document.getElementById('cust-city').value.trim();
  const customerPincode = document.getElementById('cust-pincode').value.trim();
  const deliveryNotes = document.getElementById('cust-notes').value.trim();
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'Cash on Delivery';

  const orderItems = Object.values(cart).map(item => ({
    productId: item.id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price
  }));

  if (orderItems.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  // Loading state
  placeOrderBtn.disabled = true;
  btnSpinner.style.display = 'inline-block';

  try {
    const payload = {
      customer: {
        fullName: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
        city: customerCity,
        pincode: customerPincode
      },
      items: orderItems,
      paymentMethod,
      deliveryNotes
    };

    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.details || result.error || 'Failed to place order in PostgreSQL.');
    }

    // Success! Show Receipt
    closeCheckout();
    showOrderSuccess(result.order);

    // Clear cart
    cart = {};
    saveCart();
    updateCartUI();
    allProducts.forEach(p => updateCardButtons(p.id));

  } catch (err) {
    console.error('Order creation error:', err);
    alert(`Could not complete order: ${err.message}\n\nPlease check that PostgreSQL is running and the database tables are migrated.`);
  } finally {
    placeOrderBtn.disabled = false;
    btnSpinner.style.display = 'none';
  }
});

function showOrderSuccess(order) {
  receiptOrderId.textContent = `#FM-${order.id}`;
  receiptCustomerName.textContent = order.customer?.full_name || 'Customer';
  receiptAddress.textContent = `${order.customer?.address || ''}, ${order.customer?.city || ''}`;
  receiptPayment.textContent = order.paymentMethod || 'Cash on Delivery';
  receiptTotal.textContent = `₹${parseFloat(order.totalAmount).toFixed(2)}`;

  successModal.classList.add('open');
  successBackdrop.classList.add('open');
}

function closeSuccessModal() {
  successModal.classList.remove('open');
  successBackdrop.classList.remove('open');
}

// ==========================================
// Reports Modal (Python FastAPI Integration)
// ==========================================
reportsNavBtn.addEventListener('click', () => {
  openReportsModal();
  loadSalesReport();
});

closeReportsBtn.addEventListener('click', closeReportsModal);
reportsBackdrop.addEventListener('click', closeReportsModal);

function openReportsModal() {
  reportsModal.classList.add('open');
  reportsBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeReportsModal() {
  reportsModal.classList.remove('open');
  reportsBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

async function loadSalesReport() {
  setActiveTab(0);
  reportsContentArea.innerHTML = '<div class="reports-loading">Fetching sales metrics from Analytics API...</div>';

  try {
    const res = await fetch(`${PYTHON_API_BASE}/api/reports/sales/summary`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    reportsContentArea.innerHTML = `
      <div class="metric-cards-grid">
        <div class="metric-stat-card">
          <div class="stat-title">Total Orders</div>
          <div class="stat-value">${data.metrics.total_orders}</div>
        </div>
        <div class="metric-stat-card">
          <div class="stat-title">Gross Revenue</div>
          <div class="stat-value" style="color: #059669;">₹${data.metrics.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="metric-stat-card">
          <div class="stat-title">Avg. Order Value</div>
          <div class="stat-value">₹${data.metrics.average_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="metric-stat-card">
          <div class="stat-title">Delivery Fees</div>
          <div class="stat-value">₹${data.metrics.total_delivery_fees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <h4 style="margin-bottom: 12px; font-family: Outfit; font-size: 1.1rem;">Payment Method Breakdown</h4>
      <div style="background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
          <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <tr>
              <th style="padding: 10px 14px;">Method</th>
              <th style="padding: 10px 14px;">Orders Count</th>
              <th style="padding: 10px 14px;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${data.payment_methods_breakdown.length > 0 
              ? data.payment_methods_breakdown.map(p => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 14px; font-weight: 600;">${p.payment_method}</td>
                  <td style="padding: 10px 14px;">${p.order_count}</td>
                  <td style="padding: 10px 14px; color: #059669; font-weight: 700;">₹${p.total_revenue.toFixed(2)}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #94a3b8;">No orders recorded yet. Place an order on the storefront to see live reports!</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    reportsContentArea.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #64748b;">
        <p style="font-size: 1.1rem; color: #991b1b; font-weight: 700; margin-bottom: 8px;">Analytics Service Offline</p>
        <p style="font-size: 0.9rem; margin-bottom: 14px;">
          Unable to retrieve sales metrics. Please verify database connection and retry.
        </p>
        <button class="primary-btn" onclick="loadSalesReport()">Retry</button>
      </div>
    `;
  }
}

async function loadStockReport() {
  setActiveTab(1);
  reportsContentArea.innerHTML = '<div class="reports-loading">Loading stock valuation and inventory levels from database...</div>';

  try {
    const [valRes, stockRes] = await Promise.all([
      fetch(`${PYTHON_API_BASE}/api/reports/stock/inventory-value`),
      fetch(`${PYTHON_API_BASE}/api/reports/stock/low-stock?threshold=30`)
    ]);

    const valData = await valRes.json();
    const stockData = await stockRes.json();

    reportsContentArea.innerHTML = `
      <div class="metric-cards-grid">
        <div class="metric-stat-card">
          <div class="stat-title">Total Active SKUs</div>
          <div class="stat-value">${valData.overall_summary.total_unique_products}</div>
        </div>
        <div class="metric-stat-card">
          <div class="stat-title">Units in Warehouse</div>
          <div class="stat-value">${valData.overall_summary.total_inventory_units}</div>
        </div>
        <div class="metric-stat-card">
          <div class="stat-title">Total Stock Value</div>
          <div class="stat-value" style="color: #059669;">₹${valData.overall_summary.total_valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="metric-stat-card">
          <div class="stat-title">Low Stock Items</div>
          <div class="stat-value" style="color: #ea580c;">${stockData.low_stock_count}</div>
        </div>
      </div>

      <h4 style="margin-bottom: 12px; font-family: Outfit; font-size: 1.1rem;">Category-wise Inventory Value</h4>
      <div style="background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
          <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <tr>
              <th style="padding: 10px 14px;">Category</th>
              <th style="padding: 10px 14px;">Products</th>
              <th style="padding: 10px 14px;">Units in Stock</th>
              <th style="padding: 10px 14px;">Total Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${valData.category_breakdown.map(c => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 14px; font-weight: 600;">${c.category}</td>
                <td style="padding: 10px 14px;">${c.total_products}</td>
                <td style="padding: 10px 14px;">${c.total_units_in_stock}</td>
                <td style="padding: 10px 14px; font-weight: 700; color: #047857;">₹${c.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    reportsContentArea.innerHTML = `<div style="text-align: center; padding: 30px; color: #991b1b;">Failed to fetch stock reports from Python backend.</div>`;
  }
}

async function loadRecentOrdersReport() {
  setActiveTab(2);
  reportsContentArea.innerHTML = '<div class="reports-loading">Loading recent orders...</div>';

  try {
    const res = await fetch(`${PYTHON_API_BASE}/api/reports/customers/recent`);
    const data = await res.json();

    reportsContentArea.innerHTML = `
      <h4 style="margin-bottom: 12px; font-family: Outfit; font-size: 1.1rem;">Recent Orders Placed (${data.count})</h4>
      <div style="background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
          <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <tr>
              <th style="padding: 10px 14px;">Order ID</th>
              <th style="padding: 10px 14px;">Customer</th>
              <th style="padding: 10px 14px;">City</th>
              <th style="padding: 10px 14px;">Amount</th>
              <th style="padding: 10px 14px;">Payment</th>
              <th style="padding: 10px 14px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.orders.length > 0 
              ? data.orders.map(o => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 14px; font-weight: 700;">#FM-${o.order_id}</td>
                  <td style="padding: 10px 14px;">${escapeHtml(o.customer_name)}</td>
                  <td style="padding: 10px 14px;">${escapeHtml(o.city)}</td>
                  <td style="padding: 10px 14px; font-weight: 700; color: #047857;">₹${o.total_amount.toFixed(2)}</td>
                  <td style="padding: 10px 14px;">${o.payment_method}</td>
                  <td style="padding: 10px 14px;"><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">${o.status}</span></td>
                </tr>
              `).join('')
              : '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">No orders recorded yet.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    reportsContentArea.innerHTML = `<div style="text-align: center; padding: 30px; color: #991b1b;">Failed to fetch recent orders report.</div>`;
  }
}

function setActiveTab(index) {
  const tabs = document.querySelectorAll('.reports-toolbar .tab-btn');
  tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });
}

// ==========================================
// Event Listeners & UI Helpers
// ==========================================
function setupEventListeners() {
  // Drawer toggling
  cartTriggerBtn.addEventListener('click', openCart);
  closeCartBtn.addEventListener('click', closeCart);
  cartBackdrop.addEventListener('click', closeCart);
  closeCheckoutBtn.addEventListener('click', closeCheckout);
  cancelCheckoutBtn.addEventListener('click', closeCheckout);
  checkoutBackdrop.addEventListener('click', closeCheckout);

  // Search handling with debounce
  let debounceTimeout = null;
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      fetchProducts();
    }, 280);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    fetchProducts();
  });

  // Sorting
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    fetchProducts();
  });

  // Category Chips
  categoryChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-btn');
    if (!chip) return;

    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    currentCategory = chip.dataset.category || 'All';
    fetchProducts();
  });
}

function openCart() {
  cartDrawer.classList.add('open');
  cartBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

function selectCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.chip-btn').forEach(c => {
    c.classList.toggle('active', c.dataset.category === category);
  });
  document.querySelectorAll('.category-card-item').forEach(c => {
    const cardTitle = c.querySelector('.category-card-name')?.textContent || '';
    c.classList.toggle('active', category === 'All' ? cardTitle === 'All Items' : cardTitle === category);
  });
  fetchProducts();
  const el = document.getElementById('category-pills-bar') || document.querySelector('.products-section');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollCategories(delta) {
  const track = document.getElementById('featured-categories-track');
  if (track) {
    track.scrollBy({ left: delta, behavior: 'smooth' });
  }
}

function startDealsTimer() {
  let totalSeconds = 2 * 3600 + 44 * 60 + 18;
  setInterval(() => {
    if (totalSeconds > 0) totalSeconds--;
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    const elH = document.getElementById('timer-h');
    const elM = document.getElementById('timer-m');
    const elS = document.getElementById('timer-s');
    if (elH) elH.textContent = h;
    if (elM) elM.textContent = m;
    if (elS) elS.textContent = s;
  }, 1000);
}

function setupSearchDropdown() {
  const searchDrop = document.getElementById('search-dropdown');
  if (!searchInput || !searchDrop) return;

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 2) {
      searchDrop.style.display = 'none';
      return;
    }

    const matches = allProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    ).slice(0, 5);

    if (matches.length === 0) {
      searchDrop.innerHTML = `
        <div style="padding: 14px 16px; text-align: center; color: #64748b; font-size: 0.88rem;">
          No quick matches found for "<strong>${escapeHtml(q)}</strong>"
        </div>
      `;
    } else {
      searchDrop.innerHTML = matches.map(p => `
        <div class="search-drop-item" onclick="openQuickView(${p.id})">
          <img src="${p.image_url}" alt="${escapeHtml(p.name)}" class="search-drop-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80'">
          <div class="search-drop-details">
            <div class="search-drop-name">${escapeHtml(p.name)}</div>
            <div class="search-drop-sub">${p.category} • ${p.unit}</div>
          </div>
          <div class="search-drop-price">₹${parseFloat(p.price).toFixed(2)}</div>
          <button class="search-drop-btn" onclick="event.stopPropagation(); addToCart(${p.id});">+ ADD</button>
        </div>
      `).join('') + `
        <div class="search-drop-footer" onclick="document.getElementById('search-dropdown').style.display='none'; fetchProducts();">
          Press Enter or Click to view all results →
        </div>
      `;
    }
    searchDrop.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDrop.contains(e.target)) {
      searchDrop.style.display = 'none';
    }
  });
}

function openQuickView(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quickview-modal');
  const backdrop = document.getElementById('quickview-backdrop');
  const content = document.getElementById('quickview-content');
  const closeBtn = document.getElementById('close-quickview-btn');
  if (!modal || !content) return;

  const cartQty = cart[product.id]?.quantity || 0;
  const price = parseFloat(product.price).toFixed(2);
  const mrp = (parseFloat(product.price) * 1.15).toFixed(2);
  const savings = (parseFloat(mrp) - parseFloat(price)).toFixed(2);

  content.innerHTML = `
    <div class="quickview-body-grid">
      <div class="quickview-img-box">
        <img src="${product.image_url}" alt="${escapeHtml(product.name)}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'">
      </div>
      <div class="quickview-details-box">
        <span class="quickview-cat-badge">${product.category}</span>
        <h2 class="quickview-title">${escapeHtml(product.name)}</h2>
        <div class="quickview-meta-row">
          <span class="rating-pill">⭐ ${product.rating || '4.8'} (250+ reviews)</span>
          <span style="color: #64748b; font-size: 0.88rem;">• Pack: <strong>${product.unit}</strong></span>
        </div>
        <p class="quickview-desc">${escapeHtml(product.description || 'Farm-fresh quality guaranteed directly sourced from regional farms.')}</p>
        <span class="quickview-stock-tag">✓ In Stock & Ready for 30-Min Delivery</span>
        <div class="quickview-price-row">
          <span class="quickview-price">₹${price}</span>
          <span class="quickview-mrp">₹${mrp}</span>
          <span style="color: #ef4444; font-size: 0.88rem; font-weight: 700;">Save ₹${savings} (15% OFF)</span>
        </div>
        <div id="quickview-btn-wrap-${product.id}">
          ${cartQty > 0 
            ? `
              <div class="qty-control-group" style="padding: 8px 16px;">
                <button class="qty-btn" onclick="decrementProduct(${product.id}); openQuickView(${product.id});">−</button>
                <span class="qty-number" style="font-size: 1.1rem; padding: 0 16px;">${cartQty}</span>
                <button class="qty-btn" onclick="incrementProduct(${product.id}); openQuickView(${product.id});">+</button>
              </div>
            `
            : `
              <button class="primary-btn" style="padding: 12px 28px; font-size: 1rem; width: 100%; justify-content: center;" onclick="addToCart(${product.id}); openQuickView(${product.id});">
                🛒 Add to Basket • ₹${price}
              </button>
            `
          }
        </div>
      </div>
    </div>
  `;

  modal.classList.add('open');
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (closeBtn) {
    closeBtn.onclick = closeQuickView;
  }
  if (backdrop) {
    backdrop.onclick = closeQuickView;
  }
}

function closeQuickView() {
  const modal = document.getElementById('quickview-modal');
  const backdrop = document.getElementById('quickview-backdrop');
  if (modal) modal.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

function setupLocationModal() {
  const badge = document.getElementById('location-badge');
  const modal = document.getElementById('location-modal');
  const backdrop = document.getElementById('location-backdrop');
  const closeBtn = document.getElementById('close-location-btn');
  const cityBtns = document.querySelectorAll('.city-btn');
  const pincodeInput = document.getElementById('pincode-input');
  const applyPinBtn = document.getElementById('apply-pincode-btn');
  const pinMsg = document.getElementById('pincode-msg');

  if (badge && modal) {
    badge.addEventListener('click', () => {
      modal.classList.add('open');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeLoc() {
    if (modal) modal.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLoc);
  if (backdrop) backdrop.addEventListener('click', closeLoc);

  cityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const city = btn.dataset.city;
      const pin = btn.dataset.pin;
      const time = btn.dataset.time;
      const locVal = document.querySelector('.loc-val');
      if (locVal) locVal.innerHTML = `${city}, ${pin} ▾`;
      showToast(`Delivery location set to ${city} (${time})`, 'success');
      closeLoc();
    });
  });

  if (applyPinBtn && pincodeInput) {
    applyPinBtn.addEventListener('click', () => {
      const pin = pincodeInput.value.trim();
      if (/^\d{6}$/.test(pin)) {
        const locVal = document.querySelector('.loc-val');
        if (locVal) locVal.innerHTML = `Pincode ${pin} ▾`;
        showToast(`Delivering to ${pin} in 30 minutes!`, 'success');
        closeLoc();
      } else {
        if (pinMsg) {
          pinMsg.style.color = '#dc2626';
          pinMsg.textContent = 'Please enter a valid 6-digit Indian pincode.';
        }
      }
    });
  }
}

function filterByCategory(category) {
  selectCategory(category);
}

function resetFilters() {
  selectCategory('All');
  searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';
  const searchDrop = document.getElementById('search-dropdown');
  if (searchDrop) searchDrop.style.display = 'none';
  fetchProducts();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ️'}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

