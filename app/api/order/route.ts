import { NextResponse } from "next/server";
import { getActiveOrder, isDatabaseConfigured, resetDemoOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const order = await getActiveOrder();
    return NextResponse.json({
      order,
      isDatabaseConnected: isDatabaseConfigured(),
    });
  } catch (error) {
    console.error("Errore API GET /api/order:", error);
    return NextResponse.json(
      { error: "Impossibile recuperare l'ordine" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const newOrder = await resetDemoOrder();
    return NextResponse.json({
      success: true,
      order: newOrder,
      message: "Nuovo ordine creato con successo",
    });
  } catch (error) {
    console.error("Errore API POST /api/order:", error);
    return NextResponse.json(
      { error: "Impossibile creare un nuovo ordine" },
      { status: 500 }
    );
  }
}
