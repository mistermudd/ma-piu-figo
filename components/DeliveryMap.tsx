"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Order } from "@/lib/types";
import {
  Navigation,
  Clock,
  CheckCircle2,
  Building2,
  Home,
  Compass,
} from "lucide-react";

interface DeliveryMapProps {
  order: Order;
}

interface Point {
  x: number;
  y: number;
}

// Coordinate dei punti chiave del tracciato stradale urbano (SVG viewBox: 0 0 900 480)
const ROUTE_POINTS: Point[] = [
  { x: 120, y: 110 }, // 1. Ristorante (Partenza)
  { x: 180, y: 110 }, // Incrocio Corso Garibaldi
  { x: 260, y: 110 }, // Prosegue verso Piazza Duomo
  { x: 260, y: 190 }, // Svolta a Sud su Via Manzoni
  { x: 380, y: 190 }, // Rotatoria Ponte sul Fiume
  { x: 490, y: 190 }, // Attraversamento Ponte Verde
  { x: 490, y: 280 }, // Svolta su Corso Italia
  { x: 580, y: 280 }, // Incrocio Parco Sempione
  { x: 670, y: 280 }, // Verso Via Dante
  { x: 670, y: 370 }, // Svolta verso quartiere residenziale
  { x: 780, y: 370 }, // Arrivo: Abitazione Cliente
];

// Calcola la lunghezza totale del percorso
function getPathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// Interpola la posizione lungo il tracciato per una percentuale (0..1)
function getPositionAtProgress(
  points: Point[],
  progress: number
): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, isNaN(progress) ? 0 : progress));
  const totalLength = getPathLength(points);
  const targetDistance = clamped * totalLength;

  let accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segmentLength >= targetDistance || i === points.length - 1) {
      const remainingDist = targetDistance - accumulated;
      const t = segmentLength === 0 ? 0 : Math.min(1, Math.max(0, remainingDist / segmentLength));
      return {
        x: p0.x + dx * t,
        y: p0.y + dy * t,
      };
    }
    accumulated += segmentLength;
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

export default function DeliveryMap({ order }: DeliveryMapProps) {
  // Durata configurata in MINUTI (se nel DB c'è un valore legacy > 30 lo converte)
  const rawDuration = order.deliveryDuration;
  const durationMinutes = rawDuration
    ? rawDuration > 30
      ? Math.max(1, Math.round(rawDuration / 60))
      : rawDuration
    : 2; // Default: 2 minuti
  const durationSeconds = Math.max(30, durationMinutes * 60);
  const totalDistanceMeters = 1850;

  // Stato progresso 0..1
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const animFrameRef = useRef<number | null>(null);

  // Inizializzazione e animazione continua fluida a 60 FPS
  useEffect(() => {
    let initialElapsed = 0;
    if (order.deliveryStartedAt) {
      const startedAt = new Date(order.deliveryStartedAt).getTime();
      if (!isNaN(startedAt)) {
        const diff = (Date.now() - startedAt) / 1000;
        if (diff > 0 && diff < durationSeconds) {
          initialElapsed = diff;
        } else if (diff >= durationSeconds) {
          // Tragitto già completato nel passato: resta a destinazione
          setProgress(1);
          return;
        }
      }
    }

    // Parte dal punto calcolato in base al timestamp della gestione
    startTimeRef.current = Date.now() - initialElapsed * 1000;

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const currentProgress = Math.min(1, Math.max(0, elapsed / durationSeconds));
      setProgress(currentProgress);

      if (currentProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [order.deliveryStartedAt, order.updatedAt, order.id, durationSeconds]);

  // Posizione corrente del rider interpolata
  const riderPos = useMemo(() => {
    return getPositionAtProgress(ROUTE_POINTS, progress);
  }, [progress]);

  // Formattazione tempo in minuti e secondi
  const remainingSeconds = Math.max(0, Math.round(durationSeconds * (1 - progress)));
  const formatRemainingTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins} min ${secs > 0 ? `${secs}s` : ""}`.trim();
    }
    return `${secs}s`;
  };
  const remainingTimeFormatted = progress >= 1 ? "Arrivato!" : formatRemainingTime(remainingSeconds);

  const remainingMeters = Math.max(0, Math.round(totalDistanceMeters * (1 - progress)));
  const percentComplete = Math.min(100, Math.round(progress * 100));

  // Testo di stato del tragitto
  const routeStatusText = useMemo(() => {
    if (progress >= 1) {
      return "🎉 Il rider è arrivato al tuo indirizzo!";
    }
    if (progress > 0.8) {
      return "📍 Rider quasi arrivato, sta svoltando nella tua via!";
    }
    if (progress > 0.4) {
      return "🛵 In viaggio attraverso la città verso di te";
    }
    return "🥡 Ordine ritirato, il rider ha iniziato la consegna";
  }, [progress]);

  // Costruzione stringa del tracciato SVG
  const svgPathD = useMemo(() => {
    return ROUTE_POINTS.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  }, []);

  const totalLength = useMemo(() => getPathLength(ROUTE_POINTS), []);

  return (
    <div className="bg-white border-2 border-[#00CDBC] rounded-3xl overflow-hidden shadow-xl transition-all">
      {/* Intestazione Mappa */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#00CDBC] text-slate-950 uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              Live GPS Tracking
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Comanda #{order.orderNumber}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white mt-1.5 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#00CDBC] animate-pulse" />
            <span>Tracciamento Consegna Rider in Tempo Reale</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            {routeStatusText}
          </p>
        </div>

        {/* Badge Informativo Tempo Tragitto Impostato dalla Gestione */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-teal-200">
            <Clock className="w-3.5 h-3.5 text-[#00CDBC]" />
            <span>Tragitto: {durationMinutes} min</span>
          </div>
        </div>
      </div>

      {/* Barra Informativa Telemetria */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Tempo Rimanente
          </span>
          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {remainingTimeFormatted}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Distanza Stimata
          </span>
          <span className="text-base sm:text-lg font-black text-[#007E7A] font-mono">
            {progress >= 1 ? "0 m" : `${remainingMeters} m`}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Velocità Media
          </span>
          <span className="text-base sm:text-lg font-black text-slate-900">
            24 km/h 🛵
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Avanzamento
          </span>
          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {percentComplete}%
          </span>
        </div>
      </div>

      {/* Vista Mappa Grafica Interattiva (SVG Urbano Ad Alta Fedeltà con Overlay HTML per il Rider) */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/10] bg-[#f1f4f8] overflow-hidden select-none">
        <svg
          viewBox="0 0 900 480"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            <filter id="markerShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Sfondo Urbano - Base Cittadina */}
          <rect width="900" height="480" fill="#f1f4f8" />

          {/* Isolati / Quartieri Cittadini */}
          <rect x="40" y="30" width="180" height="60" fill="#e2e7ec" rx="8" />
          <rect x="40" y="130" width="180" height="120" fill="#e2e7ec" rx="8" />
          <rect x="40" y="270" width="180" height="170" fill="#e2e7ec" rx="8" />

          {/* Parco Verde Sempione */}
          <rect x="280" y="30" width="280" height="130" fill="#d1fae5" rx="12" stroke="#a7f3d0" strokeWidth="2" />
          <text x="420" y="100" fill="#047857" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.8">
            🌲 Parco Cittadino Sempione 🌳
          </text>

          {/* Isolati centrali */}
          <rect x="280" y="220" width="180" height="110" fill="#e2e7ec" rx="8" />
          <rect x="280" y="350" width="180" height="90" fill="#e2e7ec" rx="8" />

          {/* Canale / Fiume con ponte */}
          <path
            d="M 460,0 C 470,120 440,240 470,360 C 480,420 510,480 510,480 L 550,480 C 550,480 520,420 510,360 C 480,240 510,120 500,0 Z"
            fill="url(#riverGradient)"
            opacity="0.85"
          />
          <text x="470" y="440" fill="#1e40af" fontSize="10" fontWeight="bold" opacity="0.6" transform="rotate(-75 470,440)">
            Fiume Naviglio ~ ~ ~
          </text>

          {/* Isolati zona est (Destinazione) */}
          <rect x="580" y="30" width="280" height="130" fill="#e2e7ec" rx="8" />
          <rect x="580" y="180" width="280" height="80" fill="#e2e7ec" rx="8" />
          <rect x="580" y="300" width="70" height="140" fill="#e2e7ec" rx="8" />
          <rect x="690" y="300" width="170" height="50" fill="#e2e7ec" rx="8" />
          <rect x="690" y="390" width="170" height="50" fill="#e2e7ec" rx="8" />

          {/* RETE STRADALE (Bianca) */}
          <line x1="0" y1="110" x2="900" y2="110" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
          <line x1="0" y1="190" x2="900" y2="190" stroke="#ffffff" strokeWidth="26" strokeLinecap="round" />
          <line x1="0" y1="280" x2="900" y2="280" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
          <line x1="0" y1="370" x2="900" y2="370" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />

          <line x1="260" y1="0" x2="260" y2="480" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
          <line x1="490" y1="0" x2="490" y2="480" stroke="#ffffff" strokeWidth="26" strokeLinecap="round" />
          <line x1="670" y1="0" x2="670" y2="480" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />

          {/* Ponte sul Naviglio */}
          <rect x="470" y="175" width="40" height="30" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" rx="2" />

          {/* Nomi delle Strade (Etichette GPS) */}
          <text x="140" y="104" fill="#94a3b8" fontSize="10" fontWeight="bold">Corso Garibaldi</text>
          <text x="350" y="184" fill="#94a3b8" fontSize="10" fontWeight="bold">Via Manzoni</text>
          <text x="590" y="274" fill="#94a3b8" fontSize="10" fontWeight="bold">Corso Italia</text>
          <text x="710" y="364" fill="#94a3b8" fontSize="10" fontWeight="bold">Via Dante</text>
          <text x="254" y="240" fill="#94a3b8" fontSize="10" fontWeight="bold" transform="rotate(-90 254,240)">Viale dei Mille</text>
          <text x="664" y="240" fill="#94a3b8" fontSize="10" fontWeight="bold" transform="rotate(-90 664,240)">Via Roma</text>

          {/* TRACCIATO GPS PERCORSO (Linea tratteggiata) */}
          <path
            d={svgPathD}
            fill="none"
            stroke="#00CDBC"
            strokeWidth="8"
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />

          {/* LINEA PERCORSA DAL RIDER (Tratto completato continuo luminoso) */}
          <path
            d={svgPathD}
            fill="none"
            stroke="#00CDBC"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${totalLength * progress} ${totalLength}`}
          />

          {/* PUNTO DI PARTENZA: RISTORANTE (120, 110) */}
          <g transform="translate(120, 110)" filter="url(#markerShadow)">
            <circle r="18" fill="#0f172a" stroke="#ffffff" strokeWidth="3" />
            <text x="0" y="5" fontSize="14" textAnchor="middle">
              🍕
            </text>
            <g transform="translate(0, 30)">
              <rect
                x="-65"
                y="-10"
                width="130"
                height="20"
                rx="10"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x="0"
                y="3.5"
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                {order.restaurantName || "Ristorante"}
              </text>
            </g>
          </g>

          {/* PUNTO DI DESTINAZIONE: ABITAZIONE CLIENTE (780, 370) */}
          <g transform="translate(780, 370)" filter="url(#markerShadow)">
            <circle r="22" fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
            <circle r="18" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
            <text x="0" y="5" fontSize="14" textAnchor="middle">
              🏡
            </text>
            <g transform="translate(0, 30)">
              <rect
                x="-65"
                y="-10"
                width="130"
                height="20"
                rx="10"
                fill="#ef4444"
                stroke="#fca5a5"
                strokeWidth="1"
              />
              <text
                x="0"
                y="3.5"
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                Casa di {order.customerName || "Cliente"}
              </text>
            </g>
          </g>
        </svg>

        {/* MARKER DEL RIDER ANIMATO CON LA FOTO DELL'UTENTE (HTML Overlay - 100% visibile e senza bug di rendering) */}
        <div
          className="absolute z-20 pointer-events-none transition-transform duration-75 ease-linear"
          style={{
            left: `${(riderPos.x / 900) * 100}%`,
            top: `${(riderPos.y / 480) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Onde radar pulsanti */}
          <div className="absolute -inset-3 rounded-full bg-[#00CDBC]/30 animate-ping pointer-events-none" />
          <div className="absolute -inset-1.5 rounded-full bg-[#00CDBC]/40 animate-pulse pointer-events-none" />

          {/* Cornice rotonda con la foto del cuoco/rider */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-3 border-white shadow-2xl ring-3 ring-[#00CDBC] bg-slate-900">
            <img
              src="/chef.jpg"
              alt="Rider Matteo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Mini Badge Scooter 🛵 */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center text-xs shadow-md">
            🛵
          </div>

          {/* Etichetta fluttuante Rider Matteo */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#00CDBC] text-slate-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-lg border border-white">
            Rider Matteo • {remainingTimeFormatted}
          </div>
        </div>

        {/* Overlay Mini Bussola in basso a sinistra */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-slate-700 shadow-md z-10">
          <Compass className="w-3.5 h-3.5 text-[#00CDBC]" />
          <span>Destinazione: {order.customerAddress || "Indirizzo cliente"}</span>
        </div>

        {/* Notifica flottante quando il rider è arrivato */}
        {progress >= 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3.5 shadow-2xl border-2 border-emerald-400 text-center max-w-sm z-30 animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
              <span>Il rider è arrivato al tuo indirizzo!</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Matteo è qui! Mostragli il PIN di sicurezza a 4 cifre per ricevere il tuo ordine.
            </p>
          </div>
        )}
      </div>

      {/* Barra di avanzamento del viaggio in fondo alla card */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-teal-400 shrink-0">
            <img src="/chef.jpg" alt="Matteo Rider" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-teal-300">Avanzamento consegna su strada</span>
              <span className="text-white font-mono">{percentComplete}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00CDBC] to-emerald-400 transition-all duration-100 rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
