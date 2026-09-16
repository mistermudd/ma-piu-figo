import pg from "pg";
const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_6kRgXI7JeEvp@ep-bold-lab-b4qsw46x-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log("Tentativo di connessione a Neon PostgreSQL...");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function setup() {
  const client = await pool.connect();
  try {
    console.log("Connesso a Neon PostgreSQL con successo!");

    console.log("Creazione tabella 'orders'...");
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

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);
    `);
    console.log("Tabella 'orders' e indici verificati.");

    const countRes = await client.query("SELECT COUNT(*) FROM orders");
    const count = parseInt(countRes.rows[0].count, 10);
    console.log(`Numero ordini presenti: ${count}`);

    if (count === 0) {
      console.log("Inserimento ordine demo iniziale...");
      const demoOrder = {
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
      };

      await client.query(
        `INSERT INTO orders (
          id, order_number, customer_name, customer_address, restaurant_name,
          items, total_amount, status, delivery_code, is_code_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          demoOrder.id,
          demoOrder.orderNumber,
          demoOrder.customerName,
          demoOrder.customerAddress,
          demoOrder.restaurantName,
          JSON.stringify(demoOrder.items),
          demoOrder.totalAmount,
          demoOrder.status,
          demoOrder.deliveryCode,
          demoOrder.isCodeVerified,
        ]
      );
      console.log("Ordine demo inserito con successo.");
    }

    const testQuery = await client.query("SELECT * FROM orders ORDER BY updated_at DESC LIMIT 1");
    console.log("Ultimo ordine nel database Neon:", JSON.stringify(testQuery.rows[0], null, 2));

  } catch (err) {
    console.error("Errore durante l'inizializzazione:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
