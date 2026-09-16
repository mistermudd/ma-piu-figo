-- Schema per DeliveroMatteo su PostgreSQL (Neon)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_address VARCHAR(255) NOT NULL,
  restaurant_name VARCHAR(100) NOT NULL DEFAULT 'Pizzeria Bella Napoli',
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(32) NOT NULL DEFAULT 'RICEVUTO',
  delivery_code VARCHAR(10) NOT NULL,
  is_code_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indice per ottimizzare la ricerca per stato e data
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);
