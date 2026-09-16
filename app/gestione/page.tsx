"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Order, OrderStatus } from "@/lib/types";
import {
  CheckCircle2,
  ChefHat,
  Bike,
  ShieldCheck,
  RotateCcw,
  ArrowUpRight,
  AlertTriangle,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Database,
  Building2,
} from "lucide-react";

export default function ManagementDashboardPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [showHelperPin, setShowHelperPin] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Caricamento dati ordine
  const fetchOrder = async () => {
    try {
      const res = await fetch("/api/order", { cache: "no-store" });
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        setIsDbConnected(data.isDatabaseConnected);
      }
    } catch (err) {
      console.error("Errore recupero ordine:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 2500);
    return () => clearInterval(interval);
  }, []);

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
        alert(data.error || "Errore durante l'aggiornamento");
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
      setVerificationError("Inserisci il codice fornito dal cliente.");
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
        // Effetto coriandoli per celebrare la consegna
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setVerificationError(
          data.error ||
            "Il codice inserito non corrisponde a quello del cliente. Riprova."
        );
      }
    } catch (err) {
      console.error("Errore chiamata verifica codice:", err);
      setVerificationError("Errore di rete durante la verifica del codice.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Resetta o crea un nuovo ordine di prova
  const handleResetOrder = async () => {
    if (
      !confirm(
        "Vuoi creare un nuovo ordine di prova? Verrà generato anche un nuovo codice di consegna a 4 cifre."
      )
    ) {
      return;
    }

    setIsUpdating(true);
    setVerificationError(null);
    setVerificationSuccess(null);
    setVerificationCode("");

    try {
      const res = await fetch("/api/order", { method: "POST" });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Errore reset ordine:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#00CDBC]/30 border-t-[#00CDBC] rounded-full animate-spin" />
        <p className="text-slate-600 font-medium text-sm animate-pulse">
          Caricamento pannello di gestione in corso...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Banner per Neon Database */}
      {!isDbConnected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-start gap-3 text-xs sm:text-sm shadow-sm">
          <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Neon PostgreSQL:</span> Per sincronizzare i dati su Neon,
            imposta <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">DATABASE_URL</code> nel file <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code>. Anche in modalità demo locale, la sincronizzazione in tempo reale tra le due pagine è pienamente operativa!
          </div>
        </div>
      )}

      {/* Intestazione Dashboard */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-[#00CDBC] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Pagina 2 • Dashboard Gestione
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Comanda #{order?.orderNumber}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Pannello Ristorante & Rider
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Usa i pulsanti sottostanti per aggiornare lo stato dell&apos;ordine e verificare il codice di consegna.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleResetOrder}
            disabled={isUpdating}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            title="Crea nuovo ordine di test con nuovo codice"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nuovo Ordine Demo</span>
          </button>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-all active:scale-95 border border-slate-200"
          >
            <span>Apri Pagina Cliente</span>
            <ArrowUpRight className="w-4 h-4 text-[#007E7A]" />
          </Link>
        </div>
      </div>

      {/* Stato Attuale e Informazioni Ordine */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
              Stato Attuale dell&apos;Ordine
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
                  Rider attivo: verifica codice richiesta
                </span>
              )}
            </div>
          </div>

          {/* Dettagli cliente compatti */}
          <div className="text-xs text-slate-600 sm:text-right">
            <div>
              Cliente: <strong className="text-slate-800">{order?.customerName}</strong>
            </div>
            <div className="truncate max-w-xs">{order?.customerAddress}</div>
            <div className="text-slate-400 mt-0.5">
              Totale da incassare: <strong>{order?.totalAmount.toFixed(2)} €</strong>
            </div>
          </div>
        </div>

        {/* PULSANTI DI CONTROLLO STATO RICHIESTI */}
        <div className="mt-6">
          <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-3">
            Azioni Rapide di Cambio Stato
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

            {/* 3. Pulsante "Ordine in Consegna" */}
            <button
              onClick={() => updateStatus("IN_CONSEGNA")}
              disabled={isUpdating}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl font-bold text-sm transition-all active:scale-98 ${
                order?.status === "IN_CONSEGNA"
                  ? "bg-[#00CDBC] text-white ring-4 ring-[#00CDBC]/30 shadow-lg"
                  : "bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-[#007E7A] border border-slate-200 hover:border-[#00CDBC]"
              }`}
            >
              <Bike className="w-5 h-5" />
              <span>3. Metti in Consegna</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEZIONE SPECIALE: INPUT BOX VERIFICA CODICE CONSEGNA */}
      {order?.status === "IN_CONSEGNA" ? (
        <div className="bg-white border-2 border-[#00CDBC] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00CDBC]/15 text-[#007E7A] flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#007E7A] bg-teal-50 px-3 py-1 rounded-full">
                Verifica Consegna Rider
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                Inserisci il Codice di Consegna
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                L&apos;ordine è stato affidato al rider. Il cliente visualizza ora il suo codice a 4 cifre sulla pagina cliente. Chiedi il codice al cliente e inseriscilo qui sotto per verificare che coincida.
              </p>

              {/* Form di verifica */}
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
                    <span>Verifica e Consegna</span>
                  </button>
                </div>

                {/* Notifica di errore */}
                {verificationError && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold rounded-xl animate-shake">
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

                {/* Helper per il test rapido */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                  <span className="text-[11px]">
                    💡 Durante i test, puoi visualizzare la pagina cliente per leggere il codice.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHelperPin(!showHelperPin)}
                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium underline underline-offset-2"
                  >
                    {showHelperPin ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Nascondi suggerimento codice</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mostra codice per test</span>
                      </>
                    )}
                  </button>
                </div>

                {showHelperPin && (
                  <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 font-mono flex items-center justify-between">
                    <span>Codice memorizzato nel DB:</span>
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
            Ordine Consegnato con Successo!
          </h3>
          <p className="text-sm text-emerald-800 max-w-md mx-auto">
            Il codice è stato verificato correttamente. La consegna è stata archiviata sul database PostgreSQL.
          </p>
          <div className="pt-3">
            <button
              onClick={handleResetOrder}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Avvia un altro ordine di prova</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center text-slate-500 text-xs sm:text-sm">
          <p>
            ℹ️ Clicca su <strong>&quot;3. Metti in Consegna&quot;</strong> quando il rider ritira l&apos;ordine per far comparire il codice di consegna nella pagina cliente e attivare qui l&apos;input box di verifica.
          </p>
        </div>
      )}

      {/* Dettagli della cucina e comanda */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-[#00CDBC]" />
          Dettagli Comanda per la Cucina
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
            <span className="font-bold text-slate-700 block">Articoli da preparare:</span>
            <ul className="space-y-1.5 text-slate-600">
              {order?.items.map((it) => (
                <li key={it.id} className="flex justify-between">
                  <span>
                    • <strong className="text-slate-800">{it.quantity}x</strong> {it.name}
                  </span>
                  <span className="text-slate-500 font-mono">
                    {(it.price * it.quantity).toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
            <span className="font-bold text-slate-700 block">Note e indirizzo consegna:</span>
            <p className="text-slate-600">
              {order?.customerAddress}
            </p>
            <div className="pt-2 text-slate-500 text-xs">
              Codice ID database: <span className="font-mono text-[11px] text-slate-700">{order?.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
