import { Pool } from "pg";
import { Order, OrderStatus, DeliveryType } from "./types";

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
  deliveryType: "DOMICILIO",
  deliveryCode: "4829",
  isCodeVerified: false,
  estimatedTime: "15-20 min",
  deliveryDuration: 60,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Fallback in-memory quando DATABASE_URL non è impostato
let memoryOrder: Order | null = { ...DEFAULT_DEMO_ORDER };
let pool: Pool | null = null;
let isDbInitialized = false;

// Neon connection string: letta esclusivamente dalle variabili d'ambiente di sistema
function getConnectionString(): string | null {
  const connectionString = process.env.DATABASE_URL;
  if (
    !connectionString ||
    connectionString.includes("ep-sample-123456") ||
    connectionString.includes("YOUR_PASSWORD")
  ) {
    return null;
  }
  return connectionString;
}

function getPool(): Pool | null {
  const connectionString = getConnectionString();
  if (!connectionString) {
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
  const url = getConnectionString();
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
          delivery_type VARCHAR(32) NOT NULL DEFAULT 'DOMICILIO',
          delivery_code VARCHAR(10) NOT NULL,
          is_code_verified BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Aggiunge colonne se la tabella preesisteva
      await client.query(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(32) DEFAULT 'DOMICILIO'"
      );
      await client.query(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(50) DEFAULT '15-20 min'"
      );
      await client.query(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_duration INTEGER DEFAULT 60"
      );
      await client.query(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMP WITH TIME ZONE"
      );

      // Inserisce ordine demo solo la prima volta se il DB è completamente vuoto
      if (!isDbInitialized) {
        const countRes = await client.query("SELECT COUNT(*) FROM orders");
        if (parseInt(countRes.rows[0].count, 10) === 0 && memoryOrder) {
          await client.query(
            `INSERT INTO orders (
              id, order_number, customer_name, customer_address, restaurant_name,
              items, total_amount, status, delivery_type, delivery_code, is_code_verified, estimated_time, delivery_duration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              DEFAULT_DEMO_ORDER.id,
              DEFAULT_DEMO_ORDER.orderNumber,
              DEFAULT_DEMO_ORDER.customerName,
              DEFAULT_DEMO_ORDER.customerAddress,
              DEFAULT_DEMO_ORDER.restaurantName,
              JSON.stringify(DEFAULT_DEMO_ORDER.items),
              DEFAULT_DEMO_ORDER.totalAmount,
              DEFAULT_DEMO_ORDER.status,
              DEFAULT_DEMO_ORDER.deliveryType,
              DEFAULT_DEMO_ORDER.deliveryCode,
              DEFAULT_DEMO_ORDER.isCodeVerified,
              DEFAULT_DEMO_ORDER.estimatedTime || "15-20 min",
              DEFAULT_DEMO_ORDER.deliveryDuration || 60,
            ]
          );
        }
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
    deliveryType: (row.delivery_type as DeliveryType) || "DOMICILIO",
    deliveryCode: row.delivery_code,
    isCodeVerified: Boolean(row.is_code_verified),
    estimatedTime: row.estimated_time || (row.delivery_type === "RITIRO" ? "10-20 min" : "15-25 min"),
    deliveryDuration: row.delivery_duration ? Number(row.delivery_duration) : 60,
    deliveryStartedAt: row.delivery_started_at ? new Date(row.delivery_started_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getActiveOrder(): Promise<Order | null> {
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
      return null;
    } catch (err) {
      console.warn("Errore getActiveOrder su PostgreSQL, uso memory fallback:", err);
    }
  }
  return memoryOrder;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  estimatedTime?: string,
  deliveryDuration?: number
): Promise<Order | null> {
  const p = getPool();
  const isEnteringDelivery = newStatus === "IN_CONSEGNA";
  const duration = Number(deliveryDuration) || 60;

  if (p) {
    try {
      await initDatabase();
      let res;
      if (isEnteringDelivery) {
        res = await p.query(
          `UPDATE orders 
           SET status = $1, 
               delivery_started_at = CURRENT_TIMESTAMP, 
               delivery_duration = $2, 
               estimated_time = COALESCE($3, estimated_time),
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $4 
           RETURNING *`,
          [newStatus, duration, estimatedTime || null, orderId]
        );
      } else if (estimatedTime) {
        res = await p.query(
          `UPDATE orders 
           SET status = $1, estimated_time = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3 
           RETURNING *`,
          [newStatus, estimatedTime, orderId]
        );
      } else {
        res = await p.query(
          `UPDATE orders 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING *`,
          [newStatus, orderId]
        );
      }
      if (res.rows.length > 0) {
        return mapRowToOrder(res.rows[0]);
      }
    } catch (err) {
      console.warn("Errore updateOrderStatus su PostgreSQL, uso memory fallback:", err);
    }
  }

  // Fallback in-memory
  if (memoryOrder && (memoryOrder.id === orderId || true)) {
    memoryOrder = {
      ...memoryOrder,
      status: newStatus,
      estimatedTime: estimatedTime || memoryOrder.estimatedTime,
      deliveryDuration: duration,
      deliveryStartedAt: isEnteringDelivery ? new Date().toISOString() : memoryOrder.deliveryStartedAt,
      updatedAt: new Date().toISOString(),
    };
    return memoryOrder;
  }
  return null;
}

export async function deleteOrder(orderId?: string): Promise<boolean> {
  const p = getPool();
  if (p) {
    try {
      await initDatabase();
      if (orderId) {
        await p.query("DELETE FROM orders WHERE id = $1", [orderId]);
      } else {
        await p.query("DELETE FROM orders");
      }
    } catch (err) {
      console.error("Errore cancellazione ordine da PostgreSQL:", err);
    }
  }
  memoryOrder = null;
  return true;
}

export async function verifyDeliveryCode(
  orderId: string,
  inputCode: string
): Promise<{ success: boolean; order?: Order; error?: string }> {
  const cleanCode = inputCode.trim();
  const currentOrder = await getActiveOrder();

  if (!currentOrder) {
    return {
      success: false,
      error: "Nessun ordine attivo da verificare.",
    };
  }

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

  if (memoryOrder) {
    memoryOrder = {
      ...memoryOrder,
      status: "CONSEGNATO",
      isCodeVerified: true,
      updatedAt: new Date().toISOString(),
    };
  }

  return { success: true, order: memoryOrder || undefined };
}

export interface CreateOrderInput {
  restaurantName?: string;
  customerName?: string;
  customerAddress?: string;
  deliveryType?: DeliveryType;
  estimatedTime?: string;
  deliveryDuration?: number;
  items?: { id?: string; name: string; quantity: number; price: number }[];
}

export async function createNewOrder(input?: CreateOrderInput): Promise<Order> {
  const newCode = generateDeliveryCode();
  const randomOrderNum = "DEL-" + Math.floor(1000 + Math.random() * 9000);

  const rawItems = input?.items && input.items.length > 0 ? input.items : DEFAULT_DEMO_ORDER.items;
  const items = rawItems.map((item, idx) => ({
    id: item.id || `item-${Date.now()}-${idx}`,
    name: item.name.trim() || "Piatto Speciale",
    quantity: Math.max(1, Number(item.quantity) || 1),
    price: Math.max(0, Number(item.price) || 0),
  }));

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryType: DeliveryType =
    input?.deliveryType === "RITIRO" ? "RITIRO" : "DOMICILIO";

  const estimatedTime =
    input?.estimatedTime?.trim() ||
    (deliveryType === "RITIRO" ? "10-20 min" : "15-25 min");

  const deliveryDuration = Number(input?.deliveryDuration) || 60;

  const newOrder: Order = {
    id: "order-" + Date.now(),
    orderNumber: randomOrderNum,
    restaurantName: input?.restaurantName?.trim() || DEFAULT_DEMO_ORDER.restaurantName,
    customerName: input?.customerName?.trim() || DEFAULT_DEMO_ORDER.customerName,
    customerAddress: input?.customerAddress?.trim() || DEFAULT_DEMO_ORDER.customerAddress,
    items,
    totalAmount,
    status: "RICEVUTO",
    deliveryType,
    deliveryCode: newCode,
    isCodeVerified: false,
    estimatedTime,
    deliveryDuration,
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
          items, total_amount, status, delivery_type, delivery_code, is_code_verified, estimated_time, delivery_duration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          newOrder.deliveryType,
          newOrder.deliveryCode,
          newOrder.isCodeVerified,
          newOrder.estimatedTime,
          newOrder.deliveryDuration,
        ]
      );
      if (res.rows.length > 0) {
        return mapRowToOrder(res.rows[0]);
      }
    } catch (err) {
      console.warn("Errore createNewOrder su PostgreSQL, salvo in memoria:", err);
    }
  }

  memoryOrder = newOrder;
  return memoryOrder;
}

export const resetDemoOrder = createNewOrder;

