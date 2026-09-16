export type OrderStatus =
  | "RICEVUTO"
  | "ACCETTATO"
  | "IN_PREPARAZIONE"
  | "IN_CONSEGNA"
  | "CONSEGNATO";

export type DeliveryType = "DOMICILIO" | "RITIRO";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  restaurantName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryCode: string;
  isCodeVerified: boolean;
  estimatedTime?: string;
  createdAt: string;
  updatedAt: string;
}

export function getOrderSteps(deliveryType: DeliveryType = "DOMICILIO") {
  const isPickup = deliveryType === "RITIRO";
  return [
    {
      status: "RICEVUTO" as OrderStatus,
      title: "Ordine Ricevuto",
      description: "Il ristorante ha preso in carico la comanda.",
      stepNumber: 1,
    },
    {
      status: "ACCETTATO" as OrderStatus,
      title: "Ordine Accettato",
      description: "La cucina ha confermato la preparazione.",
      stepNumber: 2,
    },
    {
      status: "IN_PREPARAZIONE" as OrderStatus,
      title: "In Preparazione",
      description: "I tuoi piatti sono in preparazione con ingredienti freschi.",
      stepNumber: 3,
    },
    {
      status: "IN_CONSEGNA" as OrderStatus,
      title: isPickup ? "Pronto per il Ritiro" : "In Consegna",
      description: isPickup
        ? "Il tuo ordine è pronto al banco per essere ritirato!"
        : "Il rider ha ritirato l'ordine ed è in viaggio verso di te!",
      stepNumber: 4,
    },
    {
      status: "CONSEGNATO" as OrderStatus,
      title: isPickup ? "Ritirato" : "Consegnato",
      description: isPickup
        ? "Ordine ritirato al banco con successo. Buon appetito!"
        : "Ordine consegnato a casa con successo. Buon appetito!",
      stepNumber: 5,
    },
  ];
}

export const ORDER_STEPS = getOrderSteps("DOMICILIO");
