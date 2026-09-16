"use client";

import { useEffect, useState } from "react";
import { Order, OrderStatus, getOrderSteps } from "@/lib/types";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Bike,
  ShoppingBag,
  PartyPopper,
  MapPin,
  Store,
  Receipt,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Database,
  Flame,
} from "lucide-react";
import DeliveryMap from "@/components/DeliveryMap";

export default function CustomerOrderPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Caricamento dati ordine con polling ogni 2 secondi per aggiornamenti in tempo reale
  const fetchOrder = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch("/api/order", { cache: "no-store" });
      const data = await res.json();
      setOrder(data.order || null);
      setIsDbConnected(data.isDatabaseConnected);
    } catch (err) {
      console.error("Errore recupero ordine:", err);
    } finally {
      setIsLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      fetchOrder();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const copyCode = () => {
    if (!order?.deliveryCode) return;
    navigator.clipboard.writeText(order.deliveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#00CDBC]/30 border-t-[#00CDBC] rounded-full animate-spin" />
        <p className="text-slate-600 font-medium text-sm animate-pulse">
          Caricamento dettagli ordine in corso...
        </p>
      </div>
    );
  }

  // Quando non c'è alcun ordine attivo (ordine cancellato o non presente)
  if (!order) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto py-8">
        {!isDbConnected && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-start gap-3 text-xs sm:text-sm shadow-sm">
            <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Modalità Dimostrativa Attiva:</span>{" "}
              Il database Neon PostgreSQL non è ancora collegato o raggiungibile.
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center shadow-sm relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#00CDBC]/10 text-[#007E7A] flex items-center justify-center mb-5 ring-8 ring-[#00CDBC]/5">
            <Clock className="w-10 h-10 animate-pulse text-[#00CDBC]" />
          </div>

          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00CDBC] animate-ping" />
            In attesa
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            In attesa del cliente
          </h1>

          <p className="text-slate-600 text-sm sm:text-base mt-3 max-w-md mx-auto leading-relaxed">
            Non c'è alcun ordine attivo al momento. Non appena verrà registrata una nuova comanda, i dettagli e lo stato di avanzamento compariranno qui automaticamente in tempo reale.
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronizzazione in tempo reale attiva
          </div>
        </div>
      </div>
    );
  }

  const currentSteps = getOrderSteps(order?.deliveryType || "DOMICILIO");
  const currentStepIndex = currentSteps.findIndex(
    (step) => step.status === order?.status
  );

  const isPickup = order?.deliveryType === "RITIRO";

  const getStepIcon = (status: OrderStatus, index: number) => {
    const isCompleted = index < currentStepIndex;
    const isCurrent = index === currentStepIndex;

    const iconProps = {
      className: `w-5 h-5 ${
        isCurrent
          ? "text-white animate-bounce"
          : isCompleted
          ? "text-white"
          : "text-slate-400"
      }`,
    };

    switch (status) {
      case "RICEVUTO":
        return <Clock {...iconProps} />;
      case "ACCETTATO":
        return <CheckCircle2 {...iconProps} />;
      case "IN_PREPARAZIONE":
        if (isCurrent) {
          return (
            <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden p-0.5">
              <img
                src="/chef.jpg"
                alt="Chef al lavoro"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          );
        }
        return <ChefHat {...iconProps} />;
      case "IN_CONSEGNA":
        return isPickup ? <ShoppingBag {...iconProps} /> : <Bike {...iconProps} />;
      case "CONSEGNATO":
        return <PartyPopper {...iconProps} />;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Banner per Neon Database */}
      {!isDbConnected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-start gap-3 text-xs sm:text-sm shadow-sm">
          <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Modalità Dimostrativa Attiva:</span>{" "}
            Il database Neon PostgreSQL non è ancora collegato o raggiungibile.
            Assicurati che la variabile <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">DATABASE_URL</code> sia configurata nelle impostazioni Environment di Render o nel file <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code>. Le modifiche di stato funzionano comunque istantaneamente in entrambe le modalità!
          </div>
        </div>
      )}

      {/* Intestazione Ordine */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-[#00CDBC]/10 text-[#007E7A] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {isPickup ? "🛍️ Ritiro al Locale (Asporto)" : "🛵 Consegna a Domicilio"}
            </span>
            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-0.5 rounded-full">
              #{order?.orderNumber}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {isPickup ? "Il tuo ordine è in preparazione per il ritiro!" : "Il tuo ordine è in arrivo!"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {isPickup
              ? "Segui l'avanzamento in cucina e preparati a ritirare i tuoi piatti al ristorante."
              : "Segui l'avanzamento in tempo reale della preparazione e della consegna a casa."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => fetchOrder(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition-colors active:scale-95 disabled:opacity-50 shadow-xs"
            title="Aggiorna manualmente"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#00CDBC]" : ""}`} />
            <span>Aggiornamento Live</span>
          </button>
        </div>
      </div>

      {/* Sezione Avanzamento Ordine (Stepper Progressivo) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#00CDBC]" />
            Avanzamento Ordine
          </h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            Fase {currentStepIndex + 1} di {currentSteps.length}
          </span>
        </div>

        {/* Fasi dell'Ordine (Icone e Titoli) */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 mt-2">
          {currentSteps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.status}
                className="flex flex-col items-center text-center group"
              >
                <div
                  className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isCurrent
                      ? "bg-[#00CDBC] text-white ring-4 ring-[#00CDBC]/25 shadow-lg scale-105"
                      : isCompleted
                      ? "bg-[#00CDBC] text-white shadow-sm"
                      : "bg-slate-50 border-2 border-slate-200 text-slate-400"
                  }`}
                >
                  {getStepIcon(step.status, idx)}
                </div>
                <span
                  className={`mt-2.5 text-[10px] sm:text-xs md:text-sm font-semibold leading-tight line-clamp-2 ${
                    isCurrent
                      ? "text-[#007E7A] font-bold"
                      : isCompleted
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Barra di avanzamento grafica SOTTO alle fasi */}
        <div className="mt-8 mb-6">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#00CDBC] to-[#007E7A] rounded-full transition-all duration-700 ease-out shadow-xs"
              style={{
                width: `${Math.max(5, (currentStepIndex / (currentSteps.length - 1)) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-semibold text-slate-400">
            <span>Presa in carico</span>
            <span className="text-[#007E7A] font-bold">
              Fase {currentStepIndex + 1} di {currentSteps.length} (
              {Math.round((currentStepIndex / (currentSteps.length - 1)) * 100)}%)
            </span>
            <span>{isPickup ? "Ritiro" : "Consegna"}</span>
          </div>
        </div>

        {/* Stato Corrente in Evidenza */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold text-[#007E7A] tracking-wider mb-1">
              Stato Attuale
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              {currentSteps[currentStepIndex]?.title}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {currentSteps[currentStepIndex]?.description}
            </p>
          </div>

          <div className="shrink-0 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-center shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">
              Tempo stimato
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900">
              {order?.status === "CONSEGNATO"
                ? (isPickup ? "Ritirato" : "Consegnato")
                : (order?.estimatedTime || (isPickup ? "10-20 min" : "15-25 min"))}
            </span>
          </div>
        </div>
      </div>

      {/* CARD SPECIALE CUOCO IN PREPARAZIONE */}
      {order?.status === "IN_PREPARAZIONE" && (
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden animate-pulse-slow border-2 border-amber-300/40">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            {/* Foto del Cuoco con cornice e badge */}
            <div className="relative shrink-0 group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl ring-4 ring-amber-300/40 bg-slate-900 transition-transform duration-300 group-hover:scale-105">
                <img
                  src="/chef.jpg"
                  alt="Il nostro Chef in cucina"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-200 whitespace-nowrap">
                <span>👨‍🍳</span>
                <span className="text-[#007E7A]">Chef Matteo</span>
              </div>
            </div>

            {/* Testo informativo sulla preparazione */}
            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white">
                <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-bounce" />
                Ai fornelli ora • Cucina in azione
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                Lo Chef sta creando il tuo ordine con passione!
              </h3>
              <p className="text-amber-100 text-xs sm:text-sm max-w-xl">
                I tuoi piatti sono in preparazione con ingredienti freschissimi. Tempo stimato aggiornato dallo Chef: <strong className="text-white underline decoration-amber-300">{order?.estimatedTime || (isPickup ? "10-20 min" : "15-25 min")}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE: MAPPA SIMULAZIONE PERCORSO GPS CON RIDER */}
      {order?.status === "IN_CONSEGNA" && (
        <DeliveryMap order={order} />
      )}

      {/* SEZIONE: CODICE PER LA CONSEGNA */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#007E7A] flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Numero per la Consegna (Codice di Sicurezza)
            </h3>
            <p className="text-xs text-slate-500">
              Codice di verifica univoco per confermare che stai ritirando il tuo ordine
            </p>
          </div>
        </div>

        {/* CASO 1: Ordine in consegna o pronto per il ritiro -> CODICE VISIBILE CON EVIDENZA */}
        {order?.status === "IN_CONSEGNA" ? (
          <div className="bg-gradient-to-br from-teal-500 via-[#00CDBC] to-emerald-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl pulse-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left space-y-2">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white">
                  {isPickup ? (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Pronto per il Ritiro • Mostra questo codice
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Rider in arrivo • Mostra questo codice
                    </>
                  )}
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  {isPickup
                    ? "Il tuo ordine è pronto per il ritiro!"
                    : "Il tuo codice di consegna è pronto!"}
                </h4>
                <p className="text-teal-50 text-xs sm:text-sm max-w-md">
                  {isPickup
                    ? `Mostra questo codice di 4 cifre alla cassa o al personale di ${order.restaurantName} per ritirare i tuoi piatti.`
                    : "Comunica a voce o mostra questo codice di 4 cifre al rider quando citofona. Il rider lo inserirà nella sua applicazione per concludere la consegna."}
                </p>
              </div>

              {/* Box Codice Digitale */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20 shadow-2xl">
                  {order.deliveryCode.split("").map((digit, i) => (
                    <span
                      key={i}
                      className="w-12 h-14 sm:w-14 sm:h-16 bg-white text-slate-900 text-2xl sm:text-3xl font-black rounded-xl flex items-center justify-center shadow-inner tracking-widest"
                    >
                      {digit}
                    </span>
                  ))}
                </div>

                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copiato negli appunti!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia codice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : order?.status === "CONSEGNATO" ? (
          /* CASO 2: Ordine Consegnato / Ritirato */
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base">
                {isPickup ? "Codice Verificato & Ordine Ritirato!" : "Codice Verificato & Consegna Completata!"}
              </h4>
              <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                Il codice <span className="font-mono font-bold">{order?.deliveryCode}</span> è stato convalidato con successo. Speriamo che il pasto sia di tuo gradimento!
              </p>
            </div>
          </div>
        ) : (
          /* CASO 3: Ordine non ancora in consegna / pronto */
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start sm:items-center gap-3.5 text-slate-600">
            <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-slate-800">
                {isPickup
                  ? "Il codice di sicurezza comparirà qui non appena l'ordine sarà pronto per il ritiro al locale."
                  : "Il codice di sicurezza comparirà qui non appena l'ordine sarà contrassegnato come \"In Consegna\"."}
              </span>{" "}
              Attualmente il ristorante sta preparando la comanda.
            </div>
          </div>
        )}
      </div>

      {/* Dettagli Consegna e Articoli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scheda Destinazione o Ritiro e Ristorante */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              {isPickup ? (
                <ShoppingBag className="w-4 h-4 text-[#00CDBC]" />
              ) : (
                <MapPin className="w-4 h-4 text-[#00CDBC]" />
              )}
              {isPickup ? "Dati per il Ritiro al Locale" : "Dati di Consegna"}
            </h3>
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2">
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                  Cliente
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {order?.customerName}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                  {isPickup ? "Punto di Ritiro & Note" : "Indirizzo di Consegna"}
                </span>
                <span className="text-sm text-slate-700">
                  {isPickup
                    ? `Ritiro presso: ${order?.restaurantName} ${order?.customerAddress && order.customerAddress !== "Ritiro al bancone" ? `(${order.customerAddress})` : ""}`
                    : order?.customerAddress}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-[#00CDBC]" />
              Ristorante Partner
            </h3>
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
              <div className="text-sm font-bold text-slate-800">
                {order?.restaurantName}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Cucina Italiana • Pizze al forno a legna • Hamburger Gourmet
              </div>
            </div>
          </div>
        </div>

        {/* Scheda Riepilogo Piatti Ordinati */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-[#00CDBC]" />
              Riepilogo Piatti ({order?.items.length})
            </h3>

            <div className="divide-y divide-slate-100">
              {order?.items.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-[#00CDBC]/15 text-[#007E7A] font-bold text-xs flex items-center justify-center">
                      {item.quantity}x
                    </span>
                    <span className="font-medium text-slate-800">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {(item.price * item.quantity).toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-6">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
              <span>Spese di consegna</span>
              <span className="font-medium text-emerald-600">Gratis</span>
            </div>
            <div className="flex justify-between items-center text-base font-extrabold text-slate-900">
              <span>Totale Ordine</span>
              <span className="text-xl text-[#007E7A]">
                {order?.totalAmount.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
