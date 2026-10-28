# 🛰️ AstroShield: Space Weather Workstation & Magnetosphere Shield Monitor

AstroShield is a multi-modal, server-side-connected Space Weather Monitor & Geostationary Spacecraft Safety dashboard. It is engineered with custom physics-informed prediction modules, actual Python ML models registry capability, binary Common Data Format (CDF) ingest interfaces, and a high-availability real-time multi-channel notification dispatcher.

---

## 🌌 1. Core Physics-Informed Engine

AstroShield runs a digital twin of Earth's outer magnetosphere and radiation belts. It calculates solar wind parameters, planetary magnetic disturbance indexes ($Kp$), and predicts geostationary electron flux drops ($>2\text{ MeV}$) through the following fundamental aerospace equations:

### A. Solar Wind Dynamic Pressure ($P_{\text{dyn}}$)
Dynamic pressure exerted by the solar wind plasma on Earth's magnetospheric boundary is governed by:
$$P_{\text{dyn}} = 1.6726 \times 10^{-6} \times N_{\text{sw}} \times V_{\text{sw}}^2 \quad (\text{nPa})$$
*Where $N_{\text{sw}}$ represents solar proton density ($\text{cm}^{-3}$) and $V_{\text{sw}}$ represents bulk solar wind velocity ($\text{km/s}$).*

### B. Empirical Magnetopause Standoff Boundary ($r_0$)
AstroShield implements the **Shue et al. (1998)** empirical magnetopause model to locate the subsolar standoff distance (in units of Earth Radii, $R_e$):
$$r_0 = \left[10.22 + 1.29 \times \tanh\left(0.184 \times (B_z + 1.43)\right)\right] \times P_{\text{dyn}}^{-\frac{1}{6.6}} \quad (R_e)$$
*Where $B_z$ is the Interplanetary Magnetic Field (IMF) north-south vector ($\text{nT}$). If $r_0$ drops below geostationary boundary ($\le 6.6\ R_e$), geostationary satellites become directly exposed to the hostile supersonic magnetosheath radiation environment.*

### C. Planetary disturbance Index ($Kp$)
Planetary magnetosphere activity index is estimated based on solar wind speed and southward magnetic fields:
$$Kp = \min\left(9, \max\left(0, 1.5 + 0.5 \times \frac{V_{\text{sw}} - 300}{100} + (0.4 \times |B_z| \text{ if } B_z < 0)\right)\right)$$

### D. Relativistic Electron Flux Diffusion ($>2\text{ MeV}$)
Simulated in logarithmic space (due to multi-magnitude range variations):
$$\frac{d\log_{10}(F)}{dt} = S_{\text{chorus}} + D_{\text{radial}} - L_{\text{scatter}} - L_{\text{shadow}}$$
*   **Chorus Source ($S_{\text{chorus}}$):** Localized wave-particle injection driven by high $Kp$ and negative $B_z$ ($0.08 \times Kp + 3\times 10^{-4} \times (V_{sw} - 400)$).
*   **Radial Diffusion ($D_{\text{radial}}$):** Transport from magnetotail ($10^{-4} \times (V_{sw} - 300)$).
*   **Atmospheric Scattering ($L_{\text{scatter}}$):** Wave interactions leading to auroral precipitated loss ($0.01 + 0.05 \text{ if } Kp > 5$).
*   **Magnetopause Shadowing Loss ($L_{\text{shadow}}$):** Sudden log-flux dropout triggered when magnetopause boundary boundary compresses inside geosynchronous orbit:
$$L_{\text{shadow}} = 1.2 \times \frac{6.6 - r_0}{6.6} \quad (\text{if } r_0 < 6.6\ R_e)$$

---

## 🛠️ 2. Integrated Architectural Modules

The application is structured into discrete micro-windows operating within an elegant, immersive React+Vite Desktop Environment:

1.  **Solar Wind Drivers Panel (`/simControl`):** Interactive sliders to simulate Coronal Mass Ejections (CMEs) and fast solar wind streams. Contains historical flare presets (e.g., the 2003 Halloween Storm).
2.  **Magnetosphere cross-section visualizer (`/magnetosphere`):** Real-time D3.js geometric projection modeling bow shock and magnetopause boundaries dynamically.
3.  **Predictive Forecast charts (`/forecast`):** Chronological line charts graphing electron flux predictions over a 12-hour future window (including 30m, 6h, and 12h risk zones).
4.  **Instruments charging dashboard (`/instruments`):** Dual spacecraft virtual meters tracking spacecraft surface and deep-dielectric charging potentials in real-time.
5.  **CDF Data Pipeline (`/cdfIngest`):** Native binary parser UI layout to ingest standard NASA CDF file format data directly into the workstation context.
6.  **ML Model Registry (`/modelRegistry`):** Sandbox to hot-swap active prediction neural networks. Register Python ML files (`.py`), configure layers, adjust learning rate hyper-parameters, and trace evaluation metrics.
7.  **Astromagnetic Alert & Dispatch Panel (`/alertsDashboard`):** PERSISTENT mission control center to manage authorized contacts and dispatch instant multi-channel space weather warning payloads.
8.  **AI Physics Analyst (`/aiAnalyst`):** Server-side Gemini LLM connection generating live space-weather warning reports based on current situational solar wind vector metrics.

---

## 📡 3. 100% Free Communication Channels Setup

AstroShield supports both paid (Twilio SMS, AWS SES, SendGrid) and fully **free-tier communication channels** with zero setup costs or credit cards required. Configuration is defined inside the local `.env` file or container environmental headers.

### A. SMTP Email Server (FREE)
*   **Option 1: Gmail App Passwords (500 free emails/day)**
    1. Go to your Google Account ➡️ Security.
    2. Enable 2-Step Verification, then search for **App Passwords**.
    3. Register `AstroShield Engine` and copy the 16-character code.
    ```env
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=465
    SMTP_USER=your_gmail_address@gmail.com
    SMTP_PASS=abcd efgh ijkl mnop
    SMTP_FROM="ISRO AstroShield <your_gmail_address@gmail.com>"
    ```
*   **Option 2: Brevo Free SMTP (300 free emails/day)**
    1. Register at [Brevo.com](https://www.brevo.com/).
    2. Retrieve your high-priority API Key under **SMTP & API**.
    ```env
    SMTP_HOST=smtp-relay.brevo.com
    SMTP_PORT=587
    SMTP_USER=your_brevo_registered_email@domain.com
    SMTP_PASS=your_brevo_api_key_here
    SMTP_FROM="AstroShield Mission Control <your_brevo_registered_email@domain.com>"
    ```

### B. Telegram Bot API Integration (FREE - Instant Mobile Alerts)
Unlocks loud, high-priority audible alerts directly on operator smartphones:
1. Start a chat with `@BotFather` on Telegram and send `/newbot`.
2. Name the bot and copy the **Bot Token** string.
3. Create a public/private channel, add your bot as an admin, and send a message.
4. Call `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` to fetch your channel/group's `chat_id` (usually starting with a `-`).
```env
TELEGRAM_BOT_TOKEN=7482390422:AAHGf_your_bot_token_here
TELEGRAM_CHAT_ID=-1002345678901
```

### C. Discord Webhook Ingest (FREE)
Triggers rich space weather embeds into team logging channels:
1. Under Discord server settings, right-click on the alert channel.
2. Select **Edit Channel** ➡️ **Integrations** ➡️ **Webhooks** and copy the webhook URL.
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx/yyyyy
```

### D. Slack Incoming Webhooks (FREE)
1. Navigate to Slack API console, select your workspace, and enable **Incoming Webhooks**.
2. Generate, authorize, and copy the webhook link.
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXXX
```

### E. Twilio SMS (Paid - Optional)
```env
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

---

## 📂 4. Project Directory Structure

```
├── .env.example              # Environments variables schema mappings
├── ALERT_SYSTEM_SETUP.md     # In-depth operator-focused alerting handbook
├── server.ts                 # Full-stack Express router handles SMTP, Twilio, Webhooks, and Gemini proxying
├── package.json              # Applet configurations
├── src/
│   ├── App.tsx               # Primary interface orchestrator & layout boundary 
│   ├── main.tsx              # React mounting entry-point
│   ├── index.css             # Tailwind CSS & Typography import definitions
│   ├── types.ts              # Absolute TS interfaces (SolarWindData, ElectronFluxData, etc.)
│   ├── components/
│   │   ├── DesktopWindow.tsx # Draggable, closable window layout component
│   │   ├── AlertMonitorDashboard.tsx # Persistent dispatcher & authorized database module
│   │   ├── ForecastCharts.tsx # Dynamic charting core
│   │   ├── MagnetosphereView.tsx # Custom 2D canvas project rendering
│   │   ├── AnomalyMonitor.tsx # Surface and internal spacecraft charging gauges
│   │   ├── CDFProcessor.tsx # Binary parser ingest utility
│   │   └── ModelDeveloperPanel.tsx # Hot-swappable ML neural network registry
│   ├── physics/
│   │   └── magnetosphere.ts # Numerical physics formulas
│   └── services/
│     └── modelRegistry.ts    # ML simulation and forecasting index algorithms
```

---

## 🚀 5. Development & Deployment Procedures

AstroShield operates as a full-stack integrated Express + Vite application.

### Installation
```bash
npm install
```

### Run Local Dev Server
Binds on host `0.0.0.0` and port `3000`:
```bash
npm run dev
```

### Production Bundling
Compiles backend server into clean, isolated CommonJS `.cjs` using `esbuild` to bypass module system mismatches:
```bash
npm run build
```

### Boot up production instance
```bash
npm start
```

---

## 🌌 Mathematical Modeling Reference for AI Systems

When deploying additional telemetry trackers, keep in mind:
- **Z-Score Median Filtering:** Despiking routine is executed globally via a rolling five-point moving median filter to filter cosmic particle collision noise.
- **Euler-Limit Interpolation:** Out-of-transmission data gaps are smoothened via linear and cubic spline interpolation to prevent neural networks from tripping on null bounds.
- **Gemini Context Token Injection:** Grounding context is automatically injected by pulling live parameters ($V_{sw}$, $N_{sw}$, $B_z$, $r_0$, $Kp$) into the server-side proxy before querying `gemini-3.5-flash`, avoiding client-side key leakage.
