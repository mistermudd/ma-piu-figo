import { NextResponse } from "next/server";
import { getActiveOrder, isDatabaseConfigured, createNewOrder } from "@/lib/db";

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

export async function POST(request: Request) {
  try {
    let customData;
    try {
      customData = await request.json();
    } catch {
      // Body vuoto o non JSON: usa i default
      customData = undefined;
    }

    const newOrder = await createNewOrder(customData);
    return NextResponse.json({
      success: true,
      order: newOrder,
      message: "Ordine salvato e inviato al database con successo",
    });
  } catch (error) {
    console.error("Errore API POST /api/order:", error);
    return NextResponse.json(
      { error: "Impossibile creare un nuovo ordine" },
      { status: 500 }
    );
  }
}
