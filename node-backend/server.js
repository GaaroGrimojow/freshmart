// FreshMart Main Express & Node.js Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { pool, testConnection } = require('./db');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const fs = require('fs');
const frontendDir = fs.existsSync(path.join(__dirname, '..', 'frontend'))
  ? path.join(__dirname, '..', 'frontend')
  : path.join(__dirname, 'frontend');
app.use(express.static(frontendDir));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ==========================================
// API Routes
// ==========================================

/**
 * Health Check & General System Status (Supports /health and /api/health)
 */
app.get(['/health', '/api/health'], async (req, res) => {
  const dbStatus = await testConnection();
  const statusCode = dbStatus.connected ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus.connected ? 'healthy' : 'unhealthy',
    service: 'FreshMart Express Platform',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      latencyMs: dbStatus.latencyMs,
      schemaReady: dbStatus.schemaReady,
      tablesCount: dbStatus.tables ? dbStatus.tables.length : 0,
      message: dbStatus.message
    },
  });
});

/**
 * Dedicated PostgreSQL Database Health Check Endpoint
 */
app.get('/api/health/db', async (req, res) => {
  const dbStatus = await testConnection();
  const statusCode = dbStatus.connected ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus.connected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      latencyMs: dbStatus.latencyMs,
      schemaReady: dbStatus.schemaReady,
      tablesCount: dbStatus.tables ? dbStatus.tables.length : 0,
      message: dbStatus.message
    },
  });
});


/**
 * Get Product Categories with item counts and total catalog count
 */
app.get('/api/products/categories', async (req, res) => {
  try {
    const query = `
      SELECT category, COUNT(*)::int as count 
      FROM products 
      GROUP BY category 
      ORDER BY category ASC
    `;
    const result = await pool.query(query);
    const totalRes = await pool.query('SELECT COUNT(*)::int as total FROM products');
    res.json({
      success: true,
      total: totalRes.rows[0]?.total || 0,
      categories: result.rows,
    });
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories from PostgreSQL database.',
      details: err.message,
    });
  }
});

/**
 * Get Products with optional filtering, search, and sorting
 * Query params: category, search, sort (price_asc, price_desc, name_asc, rating_desc)
 */
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Filter by category (supports compound sections, direct names, and case-insensitivity)
    if (category && category !== 'All' && category !== 'all') {
      const catLower = category.trim().toLowerCase();
      if (catLower === 'fruits & vegetables' || catLower === 'fruits and vegetables') {
        params.push('Fruits', 'Vegetables');
        query += ` AND category IN ($${params.length - 1}, $${params.length})`;
      } else if (catLower === 'dairy & breakfast' || catLower === 'dairy & bakery') {
        params.push('Dairy', 'Bakery');
        query += ` AND category IN ($${params.length - 1}, $${params.length})`;
      } else if (catLower === 'staples & grains' || catLower === 'pantry & staples') {
        params.push('Pantry');
        query += ` AND (category = $${params.length} OR category ILIKE '%pantry%' OR category ILIKE '%staple%')`;
      } else if (catLower === 'spices & oils' || catLower === 'spices & condiments') {
        params.push('Spices & Condiments');
        query += ` AND (category = $${params.length} OR category ILIKE '%spice%')`;
      } else if (catLower === 'snacks & beverages') {
        params.push('Snacks', 'Beverages');
        query += ` AND category IN ($${params.length - 1}, $${params.length})`;
      } else {
        // Direct category match (case-insensitive) or substring
        params.push(category.trim());
        query += ` AND (LOWER(category) = LOWER($${params.length}) OR category ILIKE '%' || $${params.length} || '%')`;
      }
    }

    // Filter by search keyword
    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
    }

    // Sort order
    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'rating_desc') {
      query += ' ORDER BY rating DESC';
    } else if (sort === 'name_asc') {
      query += ' ORDER BY name ASC';
    } else {
      query += ' ORDER BY id ASC';
    }

    const result = await pool.query(query, params);
    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows,
    });
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({
      success: false,
      error: 'Database query failed while fetching grocery products.',
      details: err.message,
    });
  }
});

/**
 * Get Single Product by ID
 */
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Product with ID ${id} not found.`,
      });
    }

    res.json({
      success: true,
      product: result.rows[0],
    });
  } catch (err) {
    console.error(`Error fetching product ${req.params.id}:`, err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product details.',
      details: err.message,
    });
  }
});

/**
 * Create a New Grocery Order (Atomic PostgreSQL Transaction)
 * Body:
 * {
 *   customer: { fullName, email, phone, address, city, pincode },
 *   items: [ { productId, quantity, unitPrice, name } ],
 *   paymentMethod: "Cash on Delivery",
 *   deliveryNotes: "Optional instructions"
 * }
 */
app.post('/api/orders', async (req, res) => {
  const { customer, items, paymentMethod, deliveryNotes, transactionId } = req.body;

  // Basic validation
  if (!customer || !customer.fullName || !customer.phone || !customer.address) {
    return res.status(400).json({
      success: false,
      error: 'Customer details (Full Name, Phone, and Delivery Address) are required.',
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot place an order with an empty shopping cart.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Calculate subtotals and verify product prices from database
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product with ID ${item.productId} was not found.`);
      }

      const product = prodRes.rows[0];
      const qty = parseInt(item.quantity, 10);

      if (qty <= 0) {
        throw new Error(`Invalid quantity ${qty} for product "${product.name}".`);
      }

      if (product.stock_quantity < qty) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, requested: ${qty}.`);
      }

      const price = parseFloat(product.price);
      const itemSubtotal = price * qty;
      calculatedSubtotal += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        quantity: qty,
        unitPrice: price,
        subtotal: itemSubtotal,
        newStock: product.stock_quantity - qty,
      });
    }

    // Delivery fee logic: Free delivery on orders above ₹499, else ₹40
    const deliveryFee = calculatedSubtotal >= 499 ? 0.00 : 40.00;
    const totalAmount = calculatedSubtotal + deliveryFee;

    // 2. Insert or update customer
    const customerQuery = `
      INSERT INTO customers (full_name, name, email, phone, address, city, pincode)
      VALUES ($1, $1, $2, $3, $4, $5, $6)
      RETURNING id, full_name, email, phone, address, city, pincode, created_at
    `;
    const customerRes = await client.query(customerQuery, [
      customer.fullName.trim(),
      customer.email ? customer.email.trim() : 'guest@freshmart.local',
      customer.phone.trim(),
      customer.address.trim(),
      customer.city ? customer.city.trim() : 'Local Area',
      customer.pincode ? customer.pincode.trim() : '000000',
    ]);
    const savedCustomer = customerRes.rows[0];

    // 3. Insert order
    const orderStatus = (paymentMethod && paymentMethod.includes('UPI')) ? 'Payment Verified (UPI)' : 'Confirmed';
    const orderQuery = `
      INSERT INTO orders (customer_id, total_amount, subtotal, delivery_fee, status, payment_method, delivery_notes, transaction_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, customer_id, total_amount, subtotal, delivery_fee, status, payment_method, delivery_notes, transaction_id, created_at
    `;
    const orderRes = await client.query(orderQuery, [
      savedCustomer.id,
      totalAmount.toFixed(2),
      calculatedSubtotal.toFixed(2),
      deliveryFee.toFixed(2),
      orderStatus,
      paymentMethod || 'Cash on Delivery',
      deliveryNotes || '',
      transactionId || null,
    ]);
    const savedOrder = orderRes.rows[0];

    // 4. Insert order items and deduct stock
    const savedItems = [];
    for (const item of validatedItems) {
      const orderItemQuery = `
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, order_id, product_id, product_name, quantity, unit_price, subtotal
      `;
      const itemRes = await client.query(orderItemQuery, [
        savedOrder.id,
        item.productId,
        item.name,
        item.quantity,
        item.unitPrice,
        item.subtotal,
      ]);
      savedItems.push(itemRes.rows[0]);

      // Deduct inventory
      await client.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [
        item.newStock,
        item.productId,
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Grocery order placed successfully in PostgreSQL database!',
      order: {
        id: savedOrder.id,
        customer: savedCustomer,
        items: savedItems,
        subtotal: parseFloat(savedOrder.subtotal),
        deliveryFee: parseFloat(savedOrder.delivery_fee),
        totalAmount: parseFloat(savedOrder.total_amount),
        status: savedOrder.status,
        paymentMethod: savedOrder.payment_method,
        transactionId: savedOrder.transaction_id,
        createdAt: savedOrder.created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order creation failed:', err.message);
    res.status(400).json({
      success: false,
      error: 'Failed to process order.',
      details: err.message,
    });
  } finally {
    client.release();
  }
});

/**
 * Get Order Details by ID
 */
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderRes = await pool.query(
      `SELECT o.*, c.full_name, c.email, c.phone, c.address, c.city, c.pincode
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const itemsRes = await pool.query(
      `SELECT oi.*, p.unit, p.image_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      success: true,
      order: {
        ...orderRes.rows[0],
        items: itemsRes.rows,
      },
    });
  } catch (err) {
    console.error(`Error retrieving order ${req.params.id}:`, err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order.',
      details: err.message,
    });
  }
});

// ==========================================
// Reporting & Analytics API Routes
// ==========================================

/**
 * High-level sales metrics: Total Orders, Total Revenue, Avg Order Value, Payment Breakdown
 */
app.get('/api/reports/sales/summary', async (req, res) => {
  try {
    const overallRes = await pool.query(`
      SELECT 
        COUNT(id)::int AS total_orders,
        COALESCE(SUM(total_amount), 0)::numeric AS total_revenue,
        COALESCE(SUM(subtotal), 0)::numeric AS gross_merchandise_value,
        COALESCE(SUM(delivery_fee), 0)::numeric AS total_delivery_fees,
        COALESCE(AVG(total_amount), 0)::numeric AS average_order_value
      FROM orders;
    `);
    const overall = overallRes.rows[0];

    const paymentsRes = await pool.query(`
      SELECT 
        COALESCE(payment_method, 'Cash on Delivery') AS payment_method,
        COUNT(id)::int AS order_count,
        COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
      FROM orders
      GROUP BY payment_method
      ORDER BY order_count DESC;
    `);

    const statusRes = await pool.query(`
      SELECT 
        status,
        COUNT(id)::int AS order_count,
        COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
      FROM orders
      GROUP BY status;
    `);

    res.json({
      generated_at: new Date().toISOString(),
      currency: "INR (₹)",
      metrics: {
        total_orders: parseInt(overall.total_orders, 10),
        total_revenue: parseFloat(overall.total_revenue),
        gross_merchandise_value: parseFloat(overall.gross_merchandise_value),
        total_delivery_fees: parseFloat(overall.total_delivery_fees),
        average_order_value: parseFloat(parseFloat(overall.average_order_value || 0).toFixed(2)),
      },
      payment_methods_breakdown: paymentsRes.rows.map(row => ({
        payment_method: row.payment_method,
        order_count: parseInt(row.order_count, 10),
        total_revenue: parseFloat(row.total_revenue),
      })),
      status_breakdown: statusRes.rows.map(row => ({
        status: row.status,
        order_count: parseInt(row.order_count, 10),
        total_revenue: parseFloat(row.total_revenue),
      })),
    });
  } catch (err) {
    console.error('Error fetching sales summary:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch sales summary.' });
  }
});

/**
 * Top selling grocery items ranked by quantity sold and revenue
 */
app.get('/api/reports/sales/top-products', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const result = await pool.query(`
      SELECT 
        oi.product_id,
        oi.product_name,
        p.category,
        p.unit,
        SUM(oi.quantity)::int AS total_units_sold,
        SUM(oi.subtotal)::numeric AS total_revenue_generated
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY oi.product_id, oi.product_name, p.category, p.unit
      ORDER BY total_units_sold DESC, total_revenue_generated DESC
      LIMIT $1;
    `, [limit]);

    res.json({
      generated_at: new Date().toISOString(),
      currency: "INR (₹)",
      count: result.rows.length,
      top_products: result.rows.map(row => ({
        product_id: row.product_id,
        product_name: row.product_name,
        category: row.category || 'Uncategorized',
        unit: row.unit || '',
        units_sold: parseInt(row.total_units_sold, 10),
        revenue: parseFloat(row.total_revenue_generated),
      })),
    });
  } catch (err) {
    console.error('Error fetching top products:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch top products.' });
  }
});

/**
 * Products with stock below threshold for restocking
 */
app.get('/api/reports/stock/low-stock', async (req, res) => {
  try {
    const threshold = Math.min(Math.max(parseInt(req.query.threshold || '30', 10), 1), 500);
    const result = await pool.query(`
      SELECT 
        id,
        name,
        category,
        unit,
        price,
        stock_quantity,
        badge
      FROM products
      WHERE stock_quantity <= $1
      ORDER BY stock_quantity ASC, name ASC;
    `, [threshold]);

    res.json({
      generated_at: new Date().toISOString(),
      threshold,
      low_stock_count: result.rows.length,
      alert: result.rows.length > 0 ? 'Urgent restock needed' : 'Inventory levels optimal',
      items: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        price: parseFloat(row.price),
        current_stock: parseInt(row.stock_quantity, 10),
        status: row.stock_quantity <= 10 ? 'Critical Low' : 'Low Stock',
      })),
    });
  } catch (err) {
    console.error('Error fetching low stock report:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch low stock report.' });
  }
});

/**
 * Total inventory stock value grouped by category
 */
app.get('/api/reports/stock/inventory-value', async (req, res) => {
  try {
    const catRes = await pool.query(`
      SELECT 
        category,
        COUNT(id)::int AS total_products,
        COALESCE(SUM(stock_quantity), 0)::int AS total_units_in_stock,
        COALESCE(SUM(stock_quantity * price), 0)::numeric AS total_category_value
      FROM products
      GROUP BY category
      ORDER BY total_category_value DESC;
    `);

    const totalsRes = await pool.query(`
      SELECT 
        COUNT(id)::int AS total_sku_count,
        COALESCE(SUM(stock_quantity), 0)::int AS total_inventory_units,
        COALESCE(SUM(stock_quantity * price), 0)::numeric AS total_inventory_valuation
      FROM products;
    `);
    const totals = totalsRes.rows[0];

    res.json({
      generated_at: new Date().toISOString(),
      currency: "INR (₹)",
      overall_summary: {
        total_unique_products: parseInt(totals.total_sku_count || 0, 10),
        total_inventory_units: parseInt(totals.total_inventory_units || 0, 10),
        total_valuation: parseFloat(totals.total_inventory_valuation || 0),
      },
      category_breakdown: catRes.rows.map(row => ({
        category: row.category,
        total_products: parseInt(row.total_products, 10),
        total_units_in_stock: parseInt(row.total_units_in_stock, 10),
        total_value: parseFloat(row.total_category_value),
      })),
    });
  } catch (err) {
    console.error('Error fetching inventory valuation:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory valuation.' });
  }
});

/**
 * Recent orders report
 */
app.get('/api/reports/customers/recent', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '15', 10), 1), 50);
    const result = await pool.query(`
      SELECT 
        o.id AS order_id,
        COALESCE(c.full_name, c.name, 'Customer') AS customer_name,
        COALESCE(c.city, 'Local Area') AS city,
        o.total_amount,
        o.payment_method,
        o.status,
        o.created_at
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT $1;
    `, [limit]);

    res.json({
      generated_at: new Date().toISOString(),
      count: result.rows.length,
      orders: result.rows.map(row => ({
        order_id: row.order_id,
        customer_name: row.customer_name,
        city: row.city,
        total_amount: parseFloat(row.total_amount || 0),
        payment_method: row.payment_method || 'Cash on Delivery',
        status: row.status || 'Confirmed',
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching recent orders:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch recent orders.' });
  }
});

// Fallback to index.html for direct frontend navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Safe global error handler (never exposes DB passwords, stack traces, or credentials)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred. Please try again later.'
  });
});

// Host binding: 0.0.0.0 ensures the cloud container accepts external connections
const HOST = process.env.HOST || '0.0.0.0';

// Start Express Server
const server = app.listen(PORT, HOST, () => {
  console.log(`\n=================================================`);
  console.log(`🛒 FreshMart Express Platform Server is Running!`);
  console.log(`🌐 Host & Port: ${HOST}:${PORT}`);
  console.log(`📡 Products API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/products`);
  console.log(`🩺 Health API:   http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
  console.log(`=================================================\n`);
});

module.exports = { app, server };
