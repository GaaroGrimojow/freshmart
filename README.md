# 🌿 FreshMart — Full-Stack Grocery Shopping Platform

FreshMart is a complete full-stack grocery e-commerce web application featuring authentic Indian grocery items, real-time cart and quantity controls, checkout processing, and a dedicated Python analytics/reporting microservice.

---

## 🏛️ System Architecture

| Tier | Technology | Purpose & Endpoints |
|---|---|---|
| **Frontend** | HTML5, Vanilla CSS3, Vanilla JavaScript | Responsive Grocery Storefront, Basket, Search & Checkout |
| **Main Backend** | Node.js (v24), Express | Product catalog & transactional Order placement (`http://localhost:5000`) |
| **Database** | PostgreSQL, `pg` driver | Relational storage for products, customers, orders, and order items |
| **Database GUI** | pgAdmin 4 | Database visual management & query tool |
| **Analytics Service** | Python (v3.14), FastAPI, Uvicorn | Sales summaries, inventory valuation & stock alerts (`http://localhost:8000`) |

---

## 📂 Project Directory Structure

```text
freshmart/
├── frontend/
│   ├── index.html            # Main grocery shopping homepage
│   ├── styles.css            # Responsive design system & micro-animations
│   └── app.js                # Frontend store, cart, checkout, & analytics logic
├── node-backend/
│   ├── package.json          # Node dependencies (express, pg, cors, dotenv)
│   ├── server.js             # Express API server (serves frontend on port 5000)
│   ├── db.js                 # PostgreSQL connection pool with pg driver
│   ├── migrations/
│   │   └── 001_create_tables.sql  # Schema: products, customers, orders, order_items
│   ├── seeds/
│   │   └── 001_sample_products.sql # Indian grocery seed items with INR (₹) prices
│   ├── scripts/
│   │   ├── migrate.js        # Executes SQL schema migrations
│   │   ├── seed.js           # Seeds sample grocery catalog
│   │   └── setup-db.js       # Auto-creates freshmart_db, migrates, and seeds
│   ├── .env                  # Local PostgreSQL configuration
│   └── .env.example          # Environment variables template
├── python-service/
│   ├── requirements.txt      # Python dependencies (fastapi, uvicorn, psycopg2-binary)
│   ├── main.py               # FastAPI reports microservice (port 8000)
│   ├── .env                  # Python service database configuration
│   └── .env.example          # Environment variables template
└── README.md                 # Complete Windows setup and run documentation
```

---

## 🚀 Quick Start Guide (Windows)

### Prerequisites Check
Verify your installed tools in PowerShell or Command Prompt:
```cmd
node -v
npm.cmd -v
py -3 --version
```

---

### Step 1: PostgreSQL & pgAdmin Setup

1. **Open pgAdmin 4**:
   - Press the Windows Key, search for **pgAdmin 4**, and click to open.
   - Enter your master password when prompted.

2. **Verify or Create Database**:
   - In the left sidebar, expand **Servers** > **PostgreSQL 16** (or your version).
   - Right-click on **Databases** > **Create** > **Database...**
   - In the **Database** field, enter: `freshmart_db`
   - Click **Save**.

3. **Configure Password**:
   - Open `node-backend/.env` and `python-service/.env`.
   - Update `PGPASSWORD` to match the password you set for user `postgres`:
     ```env
     PGHOST=localhost
     PGPORT=5432
     PGDATABASE=freshmart_db
     PGUSER=postgres
     PGPASSWORD=your_actual_postgres_password
     ```

4. **Initialize Database Tables & Seed Data**:
   Open a terminal and run the automated database setup script:
   ```cmd
   cd node-backend
   npm.cmd run setup-db
   ```
   *This automatically executes the SQL migration creating `products`, `customers`, `orders`, and `order_items` tables and seeds 22 Indian grocery products with prices in ₹.*

---

### Step 2: Running the Node.js Express Backend & Frontend

The Node.js Express server hosts both the REST APIs and serves the static frontend directly.

```cmd
cd node-backend
npm.cmd install
npm.cmd run dev
```

- **Website URL**: [http://localhost:5000](http://localhost:5000)
- **Products API**: [http://localhost:5000/api/products](http://localhost:5000/api/products)
- **Health Check API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### Step 3: Running the Python FastAPI Reporting Service

Open a second terminal window for the analytics microservice:

```powershell
cd python-service

# 1. Create virtual environment (if not already created)
py -3 -m venv .venv

# 2. Activate virtual environment
.\.venv\Scripts\activate

# 3. Install requirements
pip install -r requirements.txt

# 4. Start FastAPI server
python main.py
```

- **Reporting Service Root**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Sales Summary API**: [http://127.0.0.1:8000/api/reports/sales/summary](http://127.0.0.1:8000/api/reports/sales/summary)
- **Stock Valuation API**: [http://127.0.0.1:8000/api/reports/stock/inventory-value](http://127.0.0.1:8000/api/reports/stock/inventory-value)
- **Low Stock Alert API**: [http://127.0.0.1:8000/api/reports/stock/low-stock](http://127.0.0.1:8000/api/reports/stock/low-stock)

---

## 🧪 Testing the APIs

### 1. Test Node.js Health & Database Status
In PowerShell:
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/health | ConvertTo-Json
```

### 2. Test Grocery Catalog Retrieval
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/products?category=Dairy%20%26%20Breakfast" | ConvertTo-Json
```

### 3. Test Order Creation
```powershell
$orderPayload = @{
    customer = @{
        fullName = "Aarav Sharma"
        phone = "9876543210"
        email = "aarav@example.com"
        address = "14, MG Road, Indiranagar"
        city = "Bengaluru"
        pincode = "560038"
    }
    items = @(
        @{ productId = 7; quantity = 2 }
        @{ productId = 8; quantity = 1 }
    )
    paymentMethod = "Cash on Delivery (COD)"
    deliveryNotes = "Please ring doorbell"
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri http://localhost:5000/api/orders -Method POST -Body $orderPayload -ContentType "application/json" | ConvertTo-Json -Depth 5
```

### 4. Test Python FastAPI Analytics
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/reports/sales/summary | ConvertTo-Json
```

---

## 🔒 Security Best Practices
- Never commit `.env` containing sensitive database passwords to Git repositories.
- Use `.env.example` as a template for team onboarding.
- Database credentials remain securely on the server-side and are never exposed to browser client JavaScript.
