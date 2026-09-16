"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Order } from "@/lib/types";
import {
  Navigation,
  RotateCcw,
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

// Interpola la posizione e l'angolo (heading) lungo il tracciato per una percentuale (0..1)
function getPositionAtProgress(
  points: Point[],
  progress: number
): { x: number; y: number; angle: number } {
  const clamped = Math.max(0, Math.min(1, progress));
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
      const t = segmentLength === 0 ? 0 : Math.min(1, remainingDist / segmentLength);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      return {
        x: p0.x + dx * t,
        y: p0.y + dy * t,
        angle,
      };
    }
    accumulated += segmentLength;
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

export default function DeliveryMap({ order }: DeliveryMapProps) {
  // Durata configurata (in secondi)
  const durationSeconds = Math.max(10, order.deliveryDuration || 60);
  const totalDistanceMeters = 1850; // Distanza fittizia realistica

  // Stato progresso 0..1
  const [progress, setProgress] = useState(0);
  const [isManualReplay, setIsManualReplay] = useState(false);
  const manualStartTimeRef = useRef<number | null>(null);

  // Calcola il progresso basandosi sull'ora reale d'inizio salvata nel DB Neon
  useEffect(() => {
    if (isManualReplay) return;

    const calculateInitialProgress = () => {
      if (!order.deliveryStartedAt) {
        return 0.1; // Se non c'è timestamp preciso, parte dall'inizio
      }
      const startedAt = new Date(order.deliveryStartedAt).getTime();
      const now = Date.now();
      const elapsed = (now - startedAt) / 1000;
      return Math.min(1, Math.max(0, elapsed / durationSeconds));
    };

    setProgress(calculateInitialProgress());

    const interval = setInterval(() => {
      if (!isManualReplay) {
        setProgress(calculateInitialProgress());
      }
    }, 500);

    return () => clearInterval(interval);
  }, [order.deliveryStartedAt, durationSeconds, isManualReplay]);

  // Gestione animazione fluida manuale (quando l'utente clicca "Riavvia Simulazione")
  useEffect(() => {
    if (!isManualReplay) return;

    let animFrame: number;
    const startTime = Date.now();
    manualStartTimeRef.current = startTime;

    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const p = Math.min(1, elapsed / durationSeconds);
      setProgress(p);

      if (p < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        setIsManualReplay(false);
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [isManualReplay, durationSeconds]);

  // Posizione corrente del rider
  const riderPos = useMemo(() => {
    return getPositionAtProgress(ROUTE_POINTS, progress);
  }, [progress]);

  // Calcoli telemetrici
  const remainingSeconds = Math.max(0, Math.round(durationSeconds * (1 - progress)));
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

  const handleRestartSimulation = () => {
    setIsManualReplay(true);
    setProgress(0);
  };

  // Costruzione stringa del tracciato SVG per il path
  const svgPathD = useMemo(() => {
    return ROUTE_POINTS.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  }, []);

  return (
    <div className="bg-white border-2 border-[#00CDBC]/40 rounded-3xl overflow-hidden shadow-lg transition-all">
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
            <Navigation className="w-5 h-5 text-[#00CDBC]" />
            <span>Tracciamento Consegna Rider in Tempo Reale</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            {routeStatusText}
          </p>
        </div>

        {/* Pulsante Riavvia Simulazione */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestartSimulation}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all border border-white/10 shadow-sm"
            title="Riavvia la simulazione dall'inizio"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isManualReplay ? "animate-spin" : ""}`} />
            <span>Riavvia Simulazione ({durationSeconds}s)</span>
          </button>
        </div>
      </div>

      {/* Barra Informativa Telemetria */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Tempo Rimanente
          </span>
          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {progress >= 1 ? "Arrivato!" : `${remainingSeconds}s`}
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
            Stato Tragitto
          </span>
          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {percentComplete}%
          </span>
        </div>
      </div>

      {/* Vista Mappa Grafica Interattiva (SVG Urbano Ad Alta Fedeltà) */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/10] bg-[#e8ecf1] overflow-hidden select-none">
        <svg
          viewBox="0 0 900 480"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Pattern Fiume con onde */}
            <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Gradiente Tracciato Completato */}
            <linearGradient id="routeProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00CDBC" />
              <stop offset="100%" stopColor="#008078" />
            </linearGradient>

            {/* Filtro Ombra per i Marker */}
            <filter id="markerShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
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

          {/* RETE STRADALE (Grigia Chiara) */}
          {/* Strade Orizzontali */}
          <line x1="0" y1="110" x2="900" y2="110" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
          <line x1="0" y1="190" x2="900" y2="190" stroke="#ffffff" strokeWidth="26" strokeLinecap="round" />
          <line x1="0" y1="280" x2="900" y2="280" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
          <line x1="0" y1="370" x2="900" y2="370" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />

          {/* Strade Verticali */}
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

          {/* TRACCIATO GPS PERCORSO (Intera linea tratteggiata) */}
          <path
            d={svgPathD}
            fill="none"
            stroke="#00CDBC"
            strokeWidth="8"
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.35"
          />

          {/* LINEA PERCORSA DAL RIDER (Solida e luminosa) */}
          <path
            d={svgPathD}
            fill="none"
            stroke="url(#routeProgressGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${getPathLength(ROUTE_POINTS) * progress} ${getPathLength(ROUTE_POINTS)}`}
          />

          {/* PUNTO DI PARTENZA: RISTORANTE (120, 110) */}
          <g transform="translate(120, 110)" filter="url(#markerShadow)">
            <circle r="22" fill="#00CDBC" fillOpacity="0.2" className="animate-ping" />
            <circle r="18" fill="#ffffff" stroke="#007E7A" strokeWidth="3" />
            <circle r="13" fill="#007E7A" />
            <g transform="translate(-8, -8) scale(0.7)">
              <Building2 className="w-6 h-6 text-white" />
            </g>

            {/* Badge Ristorante */}
            <g transform="translate(0, -28)">
              <rect x="-60" y="-12" width="120" height="20" rx="10" fill="#0f172a" opacity="0.9" />
              <text x="0" y="2" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                🏪 {order.restaurantName.length > 18 ? order.restaurantName.slice(0, 16) + "..." : order.restaurantName}
              </text>
            </g>
          </g>

          {/* PUNTO DI DESTINAZIONE: CLIENTE (780, 370) */}
          <g transform="translate(780, 370)" filter="url(#markerShadow)">
            <circle r="24" fill="#f43f5e" fillOpacity="0.25" className="animate-ping" />
            <circle r="18" fill="#ffffff" stroke="#e11d48" strokeWidth="3" />
            <circle r="13" fill="#e11d48" />
            <g transform="translate(-8, -8) scale(0.7)">
              <Home className="w-6 h-6 text-white" />
            </g>

            {/* Badge Destinazione */}
            <g transform="translate(0, -28)">
              <rect x="-65" y="-12" width="130" height="20" rx="10" fill="#0f172a" opacity="0.9" />
              <text x="0" y="2" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                🏠 Casa di {order.customerName}
              </text>
            </g>
          </g>

          {/* MARKER DEL RIDER CON LA FACCIA FORNITA DALL'UTENTE (/chef.jpg) */}
          <g
            transform={`translate(${riderPos.x}, ${riderPos.y})`}
            filter="url(#markerShadow)"
            className="transition-all duration-300 ease-out"
          >
            {/* Onde radar pulsanti attorno al rider */}
            <circle r="34" fill="#00CDBC" fillOpacity="0.25" className="animate-ping" />
            <circle r="28" fill="#00CDBC" fillOpacity="0.4" />

            {/* Cornice circolare avatar */}
            <circle r="23" fill="#ffffff" stroke="#00CDBC" strokeWidth="4" />

            {/* Foto del Rider/Chef (public/chef.jpg) con clipPath rotondo */}
            <clipPath id="riderAvatarClip">
              <circle r="20" cx="0" cy="0" />
            </clipPath>

            <image
              href="/chef.jpg"
              x="-20"
              y="-20"
              width="40"
              height="40"
              clipPath="url(#riderAvatarClip)"
              preserveAspectRatio="xMidYMid slice"
            />

            {/* Badge Scooter 🛵 attaccato all'avatar */}
            <g transform="translate(10, 10)">
              <circle r="9" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
              <text x="0" y="3.5" fontSize="10" textAnchor="middle">
                🛵
              </text>
            </g>

            {/* Etichetta fluttuante Rider Matteo */}
            <g transform="translate(0, -32)">
              <rect
                x="-55"
                y="-11"
                width="110"
                height="19"
                rx="9"
                fill="#00CDBC"
                stroke="#ffffff"
                strokeWidth="1.5"
                filter="url(#markerShadow)"
              />
              <text
                x="0"
                y="2.5"
                fill="#0f172a"
                fontSize="9"
                fontWeight="900"
                textAnchor="middle"
                letterSpacing="0.2"
              >
                Rider Matteo • {progress >= 1 ? "Arrivato" : `${remainingSeconds}s`}
              </text>
            </g>
          </g>
        </svg>

        {/* Overlay Mini Bussola & Notifica Rapida in Basso */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-slate-700 shadow-md">
          <Compass className="w-3.5 h-3.5 text-[#00CDBC]" />
          <span>Direzione: {order.customerAddress || "Destinazione cliente"}</span>
        </div>

        {progress >= 1 && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 text-center max-w-sm shadow-2xl border-2 border-emerald-400">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="text-lg font-black text-slate-900">
                Il rider è arrivato al tuo indirizzo!
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Matteo è arrivato con il tuo ordine. Mostragli il tuo PIN di sicurezza a 4 cifre per ricevere la consegna.
              </p>
              <button
                onClick={handleRestartSimulation}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#007E7A] bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rivedi percorso animato
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barra di avanzamento del viaggio */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-teal-400 shrink-0">
            <img src="/chef.jpg" alt="Matteo Rider" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-teal-300">Avanzamento consegna su strada</span>
              <span className="text-white font-mono">{percentComplete}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00CDBC] to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
