export type OrderStatus =
  | "RICEVUTO"
  | "ACCETTATO"
  | "IN_PREPARAZIONE"
  | "IN_CONSEGNA"
  | "CONSEGNATO";

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
  deliveryCode: string;
  isCodeVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ORDER_STEPS: {
  status: OrderStatus;
  title: string;
  description: string;
  stepNumber: number;
}[] = [
  {
    status: "RICEVUTO",
    title: "Ordine Ricevuto",
    description: "Il ristorante ha preso in carico la richiesta.",
    stepNumber: 1,
  },
  {
    status: "ACCETTATO",
    title: "Ordine Accettato",
    description: "La cucina ha confermato la comanda.",
    stepNumber: 2,
  },
  {
    status: "IN_PREPARAZIONE",
    title: "In Preparazione",
    description: "I tuoi piatti sono in cottura con ingredienti freschi.",
    stepNumber: 3,
  },
  {
    status: "IN_CONSEGNA",
    title: "In Consegna",
    description: "Il rider ha ritirato l'ordine ed è in viaggio verso di te!",
    stepNumber: 4,
  },
  {
    status: "CONSEGNATO",
    title: "Consegnato",
    description: "Ordine consegnato con successo. Buon appetito!",
    stepNumber: 5,
  },
];
