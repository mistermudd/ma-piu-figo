import { NextResponse } from "next/server";
import { verifyDeliveryCode } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, code } = body as { orderId: string; code: string };

    if (!orderId || !code) {
      return NextResponse.json(
        { error: "È necessario fornire l'ID ordine e il codice di consegna." },
        { status: 400 }
      );
    }

    const result = await verifyDeliveryCode(orderId, code);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Codice errato",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Codice verificato con successo! Ordine completato e consegnato.",
      order: result.order,
    });
  } catch (error) {
    console.error("Errore API POST /api/order/verify:", error);
    return NextResponse.json(
      { error: "Errore durante la verifica del codice di consegna" },
      { status: 500 }
    );
  }
}
