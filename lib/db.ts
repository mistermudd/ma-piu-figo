import { Pool } from "pg";
import { Order, OrderStatus } from "./types";

// Genera un codice casuale a 4 cifre per la verifica consegna (es. '4829')
export function generateDeliveryCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Ordine iniziale di default
const DEFAULT_DEMO_ORDER: Order = {
  id: "order-demo-001",
  orderNumber: "DEL-8492",
  customerName: "Matteo Rossi",
  customerAddress: "Via Roma 42, 20121 Milano (MI) - Citofono 3B",
  restaurantName: "Pizzeria & Burger Bella Napoli",
  items: [
    { id: "item-1", name: "Pizza Diavola (Impasto Verace)", quantity: 1, price: 9.5 },
    { id: "item-2", name: "Patatine Fritte Rustiche", quantity: 1, price: 4.5 },
    { id: "item-3", name: "Coca-Cola Zero 33cl", quantity: 2, price: 3.0 },
  ],
  totalAmount: 20.0,
  status: "RICEVUTO",
  deliveryCode: "4829",
  isCodeVerified: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Fallback in-memory quando DATABASE_URL non è ancora configurato
let memoryOrder: Order = { ...DEFAULT_DEMO_ORDER };

let pool: Pool | null = null;
let isDbInitialized = false;

function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("ep-sample-123456")) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && !url.includes("ep-sample-123456"));
}

export async function initDatabase(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;

  if (isDbInitialized) return true;

  try {
    const client = await p.connect();
    try {
      await client.query(`
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
      `);

      // Verifica se esiste già un ordine, altrimenti inserisce quello demo
      const countRes = await client.query("SELECT COUNT(*) FROM orders");
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        await client.query(
          `INSERT INTO orders (
            id, order_number, customer_name, customer_address, restaurant_name,
            items, total_amount, status, delivery_code, is_code_verified
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            DEFAULT_DEMO_ORDER.id,
            DEFAULT_DEMO_ORDER.orderNumber,
            DEFAULT_DEMO_ORDER.customerName,
            DEFAULT_DEMO_ORDER.customerAddress,
            DEFAULT_DEMO_ORDER.restaurantName,
            JSON.stringify(DEFAULT_DEMO_ORDER.items),
            DEFAULT_DEMO_ORDER.totalAmount,
            DEFAULT_DEMO_ORDER.status,
            DEFAULT_DEMO_ORDER.deliveryCode,
            DEFAULT_DEMO_ORDER.isCodeVerified,
          ]
        );
      }
      isDbInitialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn("Connessione PostgreSQL Neon non riuscita, attivo fallback:", err);
    return false;
  }
}

// Convertitore riga SQL in Oggetto TypeScript Order
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToOrder(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    restaurantName: row.restaurant_name || "Pizzeria Bella Napoli",
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items || [],
    totalAmount: parseFloat(row.total_amount) || 0,
    status: row.status as OrderStatus,
    deliveryCode: row.delivery_code,
    isCodeVerified: Boolean(row.is_code_verified),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getActiveOrder(): Promise<Order> {
  const p = getPool();
  if (p) {
    try {
      await initDatabase();
      const res = await p.query(
        "SELECT * FROM orders ORDER BY updated_at DESC LIMIT 1"
      );
      if (res.rows.length > 0) {
        return mapRowToOrder(res.rows[0]);
      }
    } catch (err) {
      console.warn("Errore getActiveOrder su PostgreSQL, uso memory fallback:", err);
    }
  }
  return memoryOrder;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<Order | null> {
  const p = getPool();
  if (p) {
    try {
      await initDatabase();
      const res = await p.query(
        `UPDATE orders 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [newStatus, orderId]
      );
      if (res.rows.length > 0) {
        return mapRowToOrder(res.rows[0]);
      }
    } catch (err) {
      console.warn("Errore updateOrderStatus su PostgreSQL, uso memory fallback:", err);
    }
  }

  // Fallback in-memory
  if (memoryOrder.id === orderId || true) {
    memoryOrder = {
      ...memoryOrder,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    return memoryOrder;
  }
  return null;
}

export async function verifyDeliveryCode(
  orderId: string,
  inputCode: string
): Promise<{ success: boolean; order?: Order; error?: string }> {
  const cleanCode = inputCode.trim();
  const currentOrder = await getActiveOrder();

  if (currentOrder.status !== "IN_CONSEGNA") {
    return {
      success: false,
      error: "L'ordine non è attualmente in fase di consegna.",
    };
  }

  if (currentOrder.deliveryCode !== cleanCode) {
    return {
      success: false,
      error: `Codice non corretto. Verifica il codice a 4 cifre fornito dal cliente (hai inserito "${cleanCode}").`,
    };
  }

  // Codice corretto: avanzamento a CONSEGNATO
  const p = getPool();
  if (p) {
    try {
      await initDatabase();
      const res = await p.query(
        `UPDATE orders 
         SET status = 'CONSEGNATO', is_code_verified = TRUE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [currentOrder.id]
      );
      if (res.rows.length > 0) {
        return { success: true, order: mapRowToOrder(res.rows[0]) };
      }
    } catch (err) {
      console.warn("Errore verifyDeliveryCode su PostgreSQL, aggiorno memoria:", err);
    }
  }

  memoryOrder = {
    ...memoryOrder,
    status: "CONSEGNATO",
    isCodeVerified: true,
    updatedAt: new Date().toISOString(),
  };

  return { success: true, order: memoryOrder };
}

export async function resetDemoOrder(): Promise<Order> {
  const newCode = generateDeliveryCode();
  const randomOrderNum = "DEL-" + Math.floor(1000 + Math.random() * 9000);
  const newOrder: Order = {
    ...DEFAULT_DEMO_ORDER,
    id: "order-" + Date.now(),
    orderNumber: randomOrderNum,
    status: "RICEVUTO",
    deliveryCode: newCode,
    isCodeVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const p = getPool();
  if (p) {
    try {
      await initDatabase();
      const res = await p.query(
        `INSERT INTO orders (
          id, order_number, customer_name, customer_address, restaurant_name,
          items, total_amount, status, delivery_code, is_code_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          newOrder.id,
          newOrder.orderNumber,
          newOrder.customerName,
          newOrder.customerAddress,
          newOrder.restaurantName,
          JSON.stringify(newOrder.items),
          newOrder.totalAmount,
          newOrder.status,
          newOrder.deliveryCode,
          newOrder.isCodeVerified,
        ]
      );
      if (res.rows.length > 0) {
        return mapRowToOrder(res.rows[0]);
      }
    } catch (err) {
      console.warn("Errore resetDemoOrder su PostgreSQL, resetto memoria:", err);
    }
  }

  memoryOrder = newOrder;
  return memoryOrder;
}
