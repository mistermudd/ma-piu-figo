"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Order, OrderItem, OrderStatus } from "@/lib/types";
import {
  CheckCircle2,
  ChefHat,
  Bike,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Database,
  Building2,
  Plus,
  Trash2,
  Utensils,
  Save,
  MapPin,
  User,
  ShoppingBag,
} from "lucide-react";

interface EditableItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function ManagementDashboardPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Stato per la verifica del codice rider
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [showHelperPin, setShowHelperPin] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Stato per il form di inserimento / modifica ordine
  const [restaurantName, setRestaurantName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"DOMICILIO" | "RITIRO">("DOMICILIO");
  const [items, setItems] = useState<EditableItem[]>([
    { id: "1", name: "Pizza Margherita con Mozzarella di Bufala", quantity: 1, price: 9.0 },
    { id: "2", name: "Patatine Fritte Croccanti", quantity: 1, price: 4.5 },
    { id: "3", name: "Coca-Cola Zero 33cl", quantity: 2, price: 3.0 },
  ]);
  const [orderSavedBanner, setOrderSavedBanner] = useState<string | null>(null);

  // Caricamento dati ordine
  const fetchOrder = async (populateForm = false) => {
    try {
      const res = await fetch("/api/order", { cache: "no-store" });
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        setIsDbConnected(data.isDatabaseConnected);

        if (populateForm) {
          setRestaurantName(data.order.restaurantName || "");
          setCustomerName(data.order.customerName || "");
          setCustomerAddress(data.order.customerAddress || "");
          if (data.order.deliveryType) {
            setDeliveryType(data.order.deliveryType);
          }
          if (data.order.items && data.order.items.length > 0) {
            setItems(data.order.items);
          }
        }
      }
    } catch (err) {
      console.error("Errore recupero ordine:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder(true);
    const interval = setInterval(() => fetchOrder(false), 2500);
    return () => clearInterval(interval);
  }, []);

  // Gestione lista prodotti dinamica
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        name: "",
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert("L'ordine deve contenere almeno un prodotto.");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof EditableItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Calcolo totale dinamico
  const calculatedTotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  // Salvataggio e creazione ordine personalizzato
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) {
      alert("Inserisci il nome del ristorante.");
      return;
    }
    if (!customerName.trim()) {
      alert("Inserisci il nome del destinatario.");
      return;
    }
    const finalAddress =
      customerAddress.trim() ||
      (deliveryType === "RITIRO" ? "Ritiro al bancone" : "");

    if (deliveryType === "DOMICILIO" && !finalAddress) {
      alert("Inserisci l'indirizzo di consegna per la consegna a domicilio.");
      return;
    }

    const validItems = items.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      alert("Aggiungi almeno un prodotto con nome valido.");
      return;
    }

    setIsSavingOrder(true);
    setOrderSavedBanner(null);

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: restaurantName.trim(),
          customerName: customerName.trim(),
          customerAddress: finalAddress,
          deliveryType,
          items: validItems.map((it) => ({
            id: it.id,
            name: it.name.trim(),
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        setOrderSavedBanner("Nuovo ordine salvato con successo nel database Neon!");
        setVerificationCode("");
        setVerificationError(null);
        setVerificationSuccess(null);
        setTimeout(() => setOrderSavedBanner(null), 4000);
      } else {
        alert(data.error || "Errore nel salvataggio dell'ordine");
      }
    } catch (err) {
      console.error("Errore salvataggio ordine:", err);
      alert("Errore di rete durante il salvataggio dell'ordine.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Aggiornamento stato ordine
  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setIsUpdating(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      const res = await fetch("/api/order/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        if (newStatus === "IN_CONSEGNA") {
          setVerificationCode("");
        }
      } else {
        alert(data.error || "Errore durante l'aggiornamento dello stato");
      }
    } catch (err) {
      console.error("Errore aggiornamento stato:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Verifica codice di consegna inserito dal rider
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!verificationCode.trim()) {
      setVerificationError("Inserisci il codice di sicurezza a 4 cifre.");
      return;
    }

    setIsUpdating(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      const res = await fetch("/api/order/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();

      if (data.success && data.order) {
        setOrder(data.order);
        setVerificationSuccess(
          "Codice corretto! Consegna verificata e completata con successo."
        );
        setVerificationCode("");
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setVerificationError(
          data.error ||
            "Il codice inserito non corrisponde a quello visualizzato dal cliente. Riprova."
        );
      }
    } catch (err) {
      console.error("Errore chiamata verifica codice:", err);
      setVerificationError("Errore di rete durante la verifica del codice.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#00CDBC]/30 border-t-[#00CDBC] rounded-full animate-spin" />
        <p className="text-slate-600 font-medium text-sm animate-pulse">
          Caricamento gestionale in corso...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Intestazione Gestionale (Indipendente, nessun link a vista cliente) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Area Riservata Partner
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Comanda #{order?.orderNumber}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Gestione Ristorante & Rider
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Inserisci i dati della consegna, gestisci gli articoli ordinati e controlla le fasi di avanzamento.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto border border-slate-200">
          <Database className="w-3.5 h-3.5 text-[#00CDBC]" />
          <span>{isDbConnected ? "Neon DB Attivo" : "Modalità Locale"}</span>
        </div>
      </div>

      {/* SEZIONE 1: FORM COMPLETO INSERIMENTO DATI ORDINE, RISTORANTE E PRODOTTI */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#007E7A] flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Dati Comanda, Ristorante e Prodotti
              </h2>
              <p className="text-xs text-slate-500">
                Inserisci o aggiorna le informazioni visibili al cliente e al rider
              </p>
            </div>
          </div>
        </div>

        {orderSavedBanner && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl flex items-center gap-2.5 animate-fadeIn">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{orderSavedBanner}</span>
          </div>
        )}

        <form onSubmit={handleSaveOrder} className="space-y-6">
          {/* Selezione Modalità: Domicilio o Ritiro */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Tipologia di Ricezione Ordine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryType("DOMICILIO")}
                className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm border-2 transition-all ${
                  deliveryType === "DOMICILIO"
                    ? "bg-[#00CDBC]/15 border-[#00CDBC] text-[#007E7A] shadow-xs ring-2 ring-[#00CDBC]/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>🛵 Consegna a Casa (Domicilio)</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType("RITIRO")}
                className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm border-2 transition-all ${
                  deliveryType === "RITIRO"
                    ? "bg-[#00CDBC]/15 border-[#00CDBC] text-[#007E7A] shadow-xs ring-2 ring-[#00CDBC]/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>🛍️ Ritiro al Locale (Asporto)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nome Ristorante */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
                <Building2 className="w-4 h-4 text-[#00CDBC]" />
                Nome Ristorante
              </label>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Es. Pizzeria & Burger Bella Napoli"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#00CDBC] focus:ring-2 focus:ring-[#00CDBC]/20 outline-none transition-all"
              />
            </div>

            {/* Nome Cliente */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
                <User className="w-4 h-4 text-[#00CDBC]" />
                Nome Cliente (Destinatario)
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Es. Matteo Rossi"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#00CDBC] focus:ring-2 focus:ring-[#00CDBC]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Indirizzo di Consegna / Dettagli Ritiro */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-4 h-4 text-[#00CDBC]" />
              {deliveryType === "DOMICILIO"
                ? "Indirizzo Completo di Consegna e Note"
                : "Note Ritiro (Opzionale, es. Ritiro al banco o al tavolo)"}
            </label>
            <input
              type="text"
              required={deliveryType === "DOMICILIO"}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder={
                deliveryType === "DOMICILIO"
                  ? "Es. Via Roma 42, 20121 Milano (MI) - Scala B, Citofono 3B"
                  : "Es. Ritiro presso il locale"
              }
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#00CDBC] focus:ring-2 focus:ring-[#00CDBC]/20 outline-none transition-all"
            />
          </div>

          {/* LISTA DINAMICA DEI PRODOTTI */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Lista Prodotti Richiesti ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs font-bold text-[#007E7A] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi Prodotto</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl"
                >
                  <span className="text-xs font-bold text-slate-400 w-6 shrink-0 text-center">
                    #{index + 1}
                  </span>

                  {/* Nome Articolo */}
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(item.id, "name", e.target.value)
                    }
                    placeholder="Nome prodotto (es. Pizza Margherita)"
                    className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#00CDBC] outline-none"
                  />

                  {/* Quantità */}
                  <div className="flex items-center gap-1 shrink-0 w-24">
                    <span className="text-xs text-slate-400 font-medium">Q.tà</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          "quantity",
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="w-full px-2.5 py-2 text-sm text-center bg-white border border-slate-300 rounded-lg focus:border-[#00CDBC] outline-none"
                    />
                  </div>

                  {/* Prezzo unitario */}
                  <div className="flex items-center gap-1 shrink-0 w-28">
                    <span className="text-xs text-slate-400 font-medium">€ cad.</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      required
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          "price",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-2.5 py-2 text-sm text-right bg-white border border-slate-300 rounded-lg focus:border-[#00CDBC] outline-none"
                    />
                  </div>

                  {/* Subtotale */}
                  <div className="text-right font-mono font-semibold text-xs text-slate-700 w-16 shrink-0 hidden sm:block">
                    {((item.price || 0) * (item.quantity || 1)).toFixed(2)} €
                  </div>

                  {/* Elimina riga */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end sm:self-auto"
                    title="Rimuovi prodotto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totale Comanda Calcolato */}
            <div className="mt-4 p-4 bg-slate-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  Totale calcolato articoli:
                </span>
                <span className="text-lg font-black text-slate-900">
                  {calculatedTotal.toFixed(2)} €
                </span>
              </div>

              <button
                type="submit"
                disabled={isSavingOrder}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[#00CDBC]" />
                <span>
                  {isSavingOrder ? "Salvataggio..." : "Salva e Crea Ordine nel DB"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SEZIONE 2: PULSANTI DI CONTROLLO STATO ORDINE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
              Stato Attivo nel Database
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                  order?.status === "RICEVUTO"
                    ? "bg-amber-100 text-amber-800"
                    : order?.status === "ACCETTATO"
                    ? "bg-blue-100 text-blue-800"
                    : order?.status === "IN_PREPARAZIONE"
                    ? "bg-purple-100 text-purple-800"
                    : order?.status === "IN_CONSEGNA"
                    ? "bg-[#00CDBC]/20 text-[#007E7A] ring-2 ring-[#00CDBC]/40"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {order?.status}
              </span>

              {order?.status === "IN_CONSEGNA" && (
                <span className="text-xs font-semibold text-[#007E7A] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                  Codice attivo sul tracciamento cliente
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600 sm:text-right">
            <div>
              Ristorante: <strong className="text-slate-900">{order?.restaurantName}</strong>
            </div>
            <div>
              Cliente: <strong className="text-slate-800">{order?.customerName}</strong>
            </div>
          </div>
        </div>

        {/* Pulsanti di cambio stato richiesti */}
        <div className="mt-6">
          <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-3">
            2. Avanzamento Fasi Ordine
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* 1. Pulsante "Ordine Accettato" */}
            <button
              onClick={() => updateStatus("ACCETTATO")}
              disabled={isUpdating}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl font-bold text-sm transition-all active:scale-98 ${
                order?.status === "ACCETTATO"
                  ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-md"
                  : "bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 hover:border-blue-300"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>1. Accetta Ordine</span>
            </button>

            {/* 2. Pulsante "Ordine in Preparazione" */}
            <button
              onClick={() => updateStatus("IN_PREPARAZIONE")}
              disabled={isUpdating}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl font-bold text-sm transition-all active:scale-98 ${
                order?.status === "IN_PREPARAZIONE"
                  ? "bg-purple-600 text-white ring-4 ring-purple-100 shadow-md"
                  : "bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-700 border border-slate-200 hover:border-purple-300"
              }`}
            >
              <ChefHat className="w-5 h-5" />
              <span>2. In Preparazione</span>
            </button>

            {/* 3. Pulsante "Ordine in Consegna o Pronto per il Ritiro" */}
            <button
              onClick={() => updateStatus("IN_CONSEGNA")}
              disabled={isUpdating}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl font-bold text-sm transition-all active:scale-98 ${
                order?.status === "IN_CONSEGNA"
                  ? "bg-[#00CDBC] text-white ring-4 ring-[#00CDBC]/30 shadow-lg"
                  : "bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-[#007E7A] border border-slate-200 hover:border-[#00CDBC]"
              }`}
            >
              {order?.deliveryType === "RITIRO" ? (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>3. Pronto per il Ritiro</span>
                </>
              ) : (
                <>
                  <Bike className="w-5 h-5" />
                  <span>3. Metti in Consegna</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SEZIONE 3: INPUT BOX VERIFICA CODICE DI CONSEGNA O RITIRO */}
      {order?.status === "IN_CONSEGNA" ? (
        <div className="bg-white border-2 border-[#00CDBC] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00CDBC]/15 text-[#007E7A] flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#007E7A] bg-teal-50 px-3 py-1 rounded-full">
                {order?.deliveryType === "RITIRO"
                  ? "Verifica Ritiro Cliente (Asporto)"
                  : "Verifica Consegna Rider"}
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                {order?.deliveryType === "RITIRO"
                  ? "Verifica PIN per Consegna al Banco"
                  : "Verifica Codice di Consegna"}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {order?.deliveryType === "RITIRO"
                  ? "L'ordine è pronto per essere ritirato. Il cliente visualizza ora il suo codice a 4 cifre. Chiedigli il PIN per convalidare il ritiro."
                  : "L'ordine è stato affidato al rider. Il cliente visualizza il suo PIN univoco. Chiedigli il codice a 4 cifre e digitalo qui sotto per verificare che sia corretto."}
              </p>

              {/* Form di verifica PIN */}
              <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value);
                        setVerificationError(null);
                      }}
                      placeholder="Es. 4829"
                      className="w-full px-5 py-4 text-2xl font-mono tracking-widest text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:bg-white focus:border-[#00CDBC] focus:ring-4 focus:ring-[#00CDBC]/20 outline-none transition-all"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      PIN a 4 cifre
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdating || !verificationCode.trim()}
                    className="flex items-center justify-center gap-2 bg-[#00CDBC] hover:bg-[#00B8A9] text-white font-bold px-7 py-4 rounded-2xl shadow-lg shadow-[#00CDBC]/25 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>
                      {order?.deliveryType === "RITIRO"
                        ? "Verifica e Completa Ritiro"
                        : "Verifica e Consegna"}
                    </span>
                  </button>
                </div>

                {/* Notifica di errore */}
                {verificationError && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold rounded-xl">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{verificationError}</span>
                  </div>
                )}

                {/* Notifica di successo */}
                {verificationSuccess && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold rounded-xl">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{verificationSuccess}</span>
                  </div>
                )}

                {/* Suggerimento codice per debug/test rapido */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                  <span className="text-[11px]">
                    💡 Modalità attiva: {order?.deliveryType === "RITIRO" ? "Ritiro al banco" : "Consegna a domicilio"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHelperPin(!showHelperPin)}
                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium underline underline-offset-2"
                  >
                    {showHelperPin ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Nascondi PIN database</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizza PIN per test</span>
                      </>
                    )}
                  </button>
                </div>

                {showHelperPin && (
                  <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 font-mono flex items-center justify-between">
                    <span>PIN registrato nel DB Neon:</span>
                    <strong className="text-base text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      {order.deliveryCode}
                    </strong>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      ) : order?.status === "CONSEGNATO" ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-emerald-950">
            {order?.deliveryType === "RITIRO"
              ? "Ordine Ritirato con Successo!"
              : "Consegna Completata con Successo!"}
          </h3>
          <p className="text-sm text-emerald-800 max-w-md mx-auto">
            Il codice PIN è stato convalidato e la comanda è stata archiviata su Neon PostgreSQL.
          </p>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center text-slate-500 text-xs sm:text-sm">
          <p>
            ℹ️ Clicca su{" "}
            <strong>
              {order?.deliveryType === "RITIRO"
                ? '"3. Pronto per il Ritiro"'
                : '"3. Metti in Consegna"'}
            </strong>{" "}
            per far comparire il codice PIN sul display del cliente e attivare qui l&apos;input box di verifica.
          </p>
        </div>
      )}
    </div>
  );
}
