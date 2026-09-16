import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db";
import { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: OrderStatus[] = [
  "RICEVUTO",
  "ACCETTATO",
  "IN_PREPARAZIONE",
  "IN_CONSEGNA",
  "CONSEGNATO",
];

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, status, estimatedTime, deliveryDuration } = body as {
      orderId: string;
      status: OrderStatus;
      estimatedTime?: string;
      deliveryDuration?: number;
    };

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Parametri orderId e status obbligatori" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Stato non valido: ${status}` },
        { status: 400 }
      );
    }

    const updatedOrder = await updateOrderStatus(
      orderId,
      status,
      estimatedTime,
      deliveryDuration
    );
    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Ordine non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Errore API PATCH /api/order/status:", error);
    return NextResponse.json(
      { error: "Errore durante l'aggiornamento dello stato" },
      { status: 500 }
    );
  }
}
