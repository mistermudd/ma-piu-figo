# 🛵 DeliveroMatteo (ma-piu-figo) - Order Tracking & Courier Dashboard

Applicazione web full-stack per il tracciamento degli ordini in stile Deliveroo, composta da due viste sincronizzate in tempo reale e collegata a un database **PostgreSQL su Neon**.

---

## 🌟 Funzionalità Principali

### 1. Pagina Cliente (`/`)
- **Avanzamento Ordine in Tempo Reale**: timeline a 5 step (Ricevuto ➔ Accettato ➔ In Preparazione ➔ In Consegna ➔ Consegnato) che si aggiorna automaticamente senza ricaricare la pagina.
- **Numero per la Consegna (Codice PIN di Sicurezza)**:
  - Appena l'ordine passa allo stato **"In Consegna"**, viene visualizzato un riquadro animato in evidenza con il codice PIN a 4 cifre (es. `4829`) e il pulsante per copiarlo.
  - Istruzioni per il cliente di comunicare il codice al rider per convalidare la ricezione.
- **Riepilogo Ordine**: indirizzo di consegna, ristorante partner, piatti ordinati e totale.

### 2. Dashboard Gestione Ristorante & Rider (`/gestione`)
- **Pulsante "Accetta Ordine"**: conferma la comanda (`ACCETTATO`).
- **Pulsante "Metti in Preparazione"**: passa l'ordine in cucina (`IN_PREPARAZIONE`).
- **Pulsante "Metti in Consegna"**:
  - Attiva la consegna (`IN_CONSEGNA`).
  - Fa comparire il codice di consegna nella pagina cliente.
  - **Fa comparire l'input box di verifica** per consentire al rider di inserire il PIN fornito dal cliente.
- **Input Box di Verifica Consegna**:
  - Il rider inserisce il codice e preme **"Verifica e Consegna"**.
  - Se il codice coincide: l'ordine viene completato con successo (`CONSEGNATO`), salvato sul database e festeggiato con animazione di coriandoli!
  - Se il codice è errato: viene mostrato un messaggio di errore chiaro e immediato.
- **Pulsante "Nuovo Ordine Demo"**: per generare istantaneamente un nuovo ordine con un nuovo PIN a 4 cifre e ripetere il test.

---

## 🐘 Collegamento a Neon PostgreSQL

1. Accedi a [Neon Console](https://console.neon.tech/) e crea o seleziona un progetto PostgreSQL.
2. Copia la stringa di connessione (Connection String), ad esempio:
   ```text
   postgresql://neondb_owner:password@ep-cool-dawn-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Crea o apri il file `.env.local` nella cartella di progetto e incolla la stringa:
   ```env
   DATABASE_URL="postgresql://neondb_owner:password@ep-cool-dawn-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   ```
4. **Fatto!** L'applicazione rileverà automaticamente la connessione a Neon, creerà la tabella `orders` e inserirà l'ordine demo se il database è vuoto.

> **Nota:** Se `DATABASE_URL` non è ancora impostato, l'applicazione attiva automaticamente una modalità demo in memoria così puoi provarla immediatamente.

---

## 🚀 Deploy su Render (render.com)

1. Accedi a [dashboard.render.com](https://dashboard.render.com).
2. Clicca su **New + ➔ Web Service** (oppure **New + ➔ Blueprint**).
3. Seleziona il repository GitHub `mistermudd/ma-piu-figo`.
4. Imposta le seguenti configurazioni:
   - **Environment**: `Node`
   - **Region**: `Ohio (US East)` *(stessa regione di Neon us-east-2 per latenza minima!)*
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: `Free`
5. Nella sezione **Environment Variables**, aggiungi:
   - `DATABASE_URL`: `postgresql://neondb_owner:npg_6kRgXI7JeEvp@ep-bold-lab-b4qsw46x-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - `NODE_VERSION`: `20.18.0`
6. Clicca su **Deploy Web Service**. Il tuo frontend Next.js sarà subito online e connesso al tuo database Neon!

---

## 💻 Avvio in Locale

### Modalità Sviluppo
```bash
npm run dev
```
Apri il browser su:
- **Vista Cliente**: [http://localhost:3000](http://localhost:3000)
- **Dashboard Gestione**: [http://localhost:3000/gestione](http://localhost:3000/gestione)

Consiglio: apri le due pagine affiancate in due schede del browser per osservare il cambio di stato istantaneo!

### Build e Produzione
```bash
npm run build
npm start
```
>>>>>>> 5ab1444 (feat: DeliveroMatteo tracking e dashboard gestione con Neon PostgreSQL)
