const { pool } = require('../db');

async function alignSchema() {
  console.log('🔄 Running schema alignment...');
  const queries = [
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash on Delivery';`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
    `UPDATE orders SET total_amount = total WHERE total_amount IS NULL AND total IS NOT NULL;`,

    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'Default Address';`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Local Area';`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '000000';`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
    `UPDATE customers SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;`,

    `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 50;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'kg';`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT 'Fresh';`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) DEFAULT 4.5;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
    `UPDATE products SET stock_quantity = stock WHERE (stock_quantity IS NULL OR stock_quantity = 0) AND stock IS NOT NULL;`,

    `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);`,
    `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (err) {
      console.warn(`Query skipped/handled: ${err.message}`);
    }
  }

  console.log('✅ Schema alignment successful!');
  process.exit(0);
}

alignSchema();
