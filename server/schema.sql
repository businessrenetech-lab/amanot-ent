-- ============================================================================
-- Amanat Business Platform — MySQL schema
-- ----------------------------------------------------------------------------
-- Design: one table per collection. Each row keeps the full typed object in a
-- JSON `data` column (lossless round-trip with the frontend TypeScript types),
-- plus a few scalar columns pulled out for indexing / SQL reporting.
--
-- You can either run `npm run db:migrate` (which reads and executes this file)
-- or paste this file into Hostinger phpMyAdmin > SQL to create the tables.
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_users (
  id          VARCHAR(64) PRIMARY KEY,
  email       VARCHAR(191),
  role        VARCHAR(32),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id           VARCHAR(64) PRIMARY KEY,
  business     VARCHAR(32),
  sku          VARCHAR(64),
  brand        VARCHAR(128),
  category     VARCHAR(128),
  stock_qty    INT,
  retail_price DECIMAL(14,2),
  data         JSON NOT NULL,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_business (business),
  INDEX idx_products_sku (sku),
  INDEX idx_products_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id            VARCHAR(64) PRIMARY KEY,
  phone         VARCHAR(32),
  customer_type VARCHAR(32),
  current_due   DECIMAL(14,2),
  data          JSON NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suppliers (
  id         VARCHAR(64) PRIMARY KEY,
  business   VARCHAR(32),
  phone      VARCHAR(32),
  data       JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppliers_business (business)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales (
  id             VARCHAR(64) PRIMARY KEY,
  business       VARCHAR(32),
  customer_id    VARCHAR(64),
  payment_status VARCHAR(16),
  grand_total    DECIMAL(14,2),
  is_draft       TINYINT(1),
  created_at     VARCHAR(40),
  data           JSON NOT NULL,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sales_business (business),
  INDEX idx_sales_customer (customer_id),
  INDEX idx_sales_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS installment_plans (
  id          VARCHAR(64) PRIMARY KEY,
  business    VARCHAR(32),
  customer_id VARCHAR(64),
  status      VARCHAR(16),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_inst_business (business),
  INDEX idx_inst_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotations (
  id         VARCHAR(64) PRIMARY KEY,
  business   VARCHAR(32),
  status     VARCHAR(16),
  data       JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quotes_business (business)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_requisitions (
  id          VARCHAR(64) PRIMARY KEY,
  business    VARCHAR(32),
  supplier_id VARCHAR(64),
  status      VARCHAR(24),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_req_business (business),
  INDEX idx_req_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id             VARCHAR(64) PRIMARY KEY,
  business       VARCHAR(32),
  supplier_id    VARCHAR(64),
  payment_status VARCHAR(16),
  data           JSON NOT NULL,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_po_business (business),
  INDEX idx_po_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id           VARCHAR(64) PRIMARY KEY,
  business     VARCHAR(32),
  category     VARCHAR(128),
  amount       DECIMAL(14,2),
  expense_date VARCHAR(40),
  data         JSON NOT NULL,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exp_business (business),
  INDEX idx_exp_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sms_logs (
  id         VARCHAR(64) PRIMARY KEY,
  business   VARCHAR(32),
  type       VARCHAR(32),
  status     VARCHAR(16),
  data       JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sms_business (business)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id              VARCHAR(64) PRIMARY KEY,
  business        VARCHAR(32),
  product_id      VARCHAR(64),
  adjustment_type VARCHAR(16),
  data            JSON NOT NULL,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_adj_business (business),
  INDEX idx_adj_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS damage_logs (
  id         VARCHAR(64) PRIMARY KEY,
  business   VARCHAR(32),
  product_id VARCHAR(64),
  data       JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dmg_business (business),
  INDEX idx_dmg_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_returns (
  id          VARCHAR(64) PRIMARY KEY,
  business    VARCHAR(32),
  supplier_id VARCHAR(64),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supret_business (business),
  INDEX idx_supret_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_returns (
  id          VARCHAR(64) PRIMARY KEY,
  invoice_id  VARCHAR(64),
  business    VARCHAR(32),
  customer_id VARCHAR(64),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_custret_business (business),
  INDEX idx_custret_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id          VARCHAR(64) PRIMARY KEY,
  business    VARCHAR(32),
  type        VARCHAR(32),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_acc_business (business),
  INDEX idx_acc_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS account_transfers (
  id          VARCHAR(64) PRIMARY KEY,
  business    VARCHAR(32),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_acctr_business (business)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id          VARCHAR(64) PRIMARY KEY,
  business    VARCHAR(32),
  supplier_id VARCHAR(64),
  data        JSON NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppay_business (business),
  INDEX idx_suppay_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Singletons + master lists: settings, auditConfig, brands, categories, etc.
-- `data` holds either a JSON object (settings/auditConfig) or a JSON array
-- (master lists like brands / categories).
CREATE TABLE IF NOT EXISTS app_singletons (
  name       VARCHAR(64) PRIMARY KEY,
  data       JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Login credentials. Separate from staff_users (which is the editable RBAC
-- profile) so password hashes are never exposed through /api/state.
CREATE TABLE IF NOT EXISTS auth_users (
  id            VARCHAR(64) PRIMARY KEY,
  email         VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  staff_user_id VARCHAR(64) NOT NULL,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
