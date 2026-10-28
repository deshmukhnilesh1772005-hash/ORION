# 🚨 ISRO AstroShield: Real-Time Alert & Notification Assembly Guide

This document supplies the required configurations to operate the **Astromagnetic Alert Monitor & Real-Time Notification System** for long-term production use. It details how the Node.js back-end interfaces with **Nodemailer SMTP** and the **Twilio SMS Gateway** to deliver global alert payloads during critical magnetopauses collapse events (< 6.6 Re).

---

## 🏗️ 1. Infrastructure Architecture

The AstroShield Back-End handles solar-wind stream validation, computes high-fidelity magnetospheric boundaries in real-time, and dispatches multi-channel notification payloads.

```
       [Solar Wind Telemetry] ➡️  [AstroShield Core Compute Engine]
                                               ⬇️
                           (Standoff compression < 6.6 Re detected)
                                               ⬇️
                       [AstroShield REST Dispatcher Node (/api/alerts/dispatch)]
                                      /                 \
                     [Nodemailer SMTP Engine]      [Twilio Web Gateway]
                                 ⬇️                         ⬇️
                        📥 High-Priority Email       📱 Relativistic SMS Alert
```

---

## 📧 2. SMTP Email Assembly Server (100% FREE Options)

SMTP alerts are extremely powerful because you can configure them completely free of charge. Here are the two best options for sending unlimited/generous free emails:

### Option A: Gmail / Google Account with App Passwords (FREE)
Standard Gmail accounts allow you to send up to **500 transaction emails per day completely free of charge**.
1. Go to your Google Account Settings page.
2. Search and click on **App Passwords** (Note: You must enable 2-Step Verification for your Google account first).
3. Create an application credential with a recognizable name like `ISRO AstroShield Core`.
4. Copy the safe 16-character code (e.g. `abcd efgh ijkl mnop`).
5. Configure your environmental variables:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your_personal_email@gmail.com
   SMTP_PASS=abcdefghijklmnop
   SMTP_FROM="ISRO AstroShield Alerts <your_personal_email@gmail.com>"
   ```

### Option B: Brevo Free Transactional SMTP (FREE Forever - 300 Emails/Day)
If you prefer not to use your personal Gmail, **Brevo (formerly Sendinblue)** offers an out-of-the-box developer SMTP with a free tier of **300 emails/day** with no credit card required.
1. Register for a free account at [Brevo.com](https://www.brevo.com/).
2. Navigate to **SMTP & API** on your profile and generate a high-priority master SMTP Key.
3. Configure your variables:
   ```env
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your_registered_brevo_email@domain.com
   SMTP_PASS=your_master_smtp_key
   SMTP_FROM="ISRO Space Physics Lab <your_registered_brevo_email@domain.com>"
   ```

---

## 📱 3. Instant Team & Mobile Alerts (100% FREE Alternatives to Paid SMS)

SMS carries expensive carrier delivery rates (Twilio charge per SMS, and you must purchase cell phone numbers). 

AstroShield includes built-in **100% Free Communication Channels** for both **Telegram Bots** and **Discord / Slack Webhooks**. These will notify your entire monitoring team instantly on their smartphones or desktops with high-priority audio alarms and rich card embeds!

### Option A: Telegram Bot API (FREE - Highly Recommended Mobile Alert)
You can set up a personal Telegram channel or group to receive instant alert text messages with loud status buzzer sounds directly on your phone!
1. Start a chat with Telegram's master bot creator `@BotFather`.
2. Send `/newbot`, name it `AstroShield Alert Bot`, and copy the **Bot Token** string.
3. Start a new group/channel, add your brand new bot to it, and send a sample message.
4. Call `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in any web browser to extract the unique group `chat_id` (usually starts with a `-`).
5. Map these keys into your local/container `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=7482390422:AAHGf_xxxxx_your_telegram_bot_token
   TELEGRAM_CHAT_ID=-1002345678901
   ```

### Option B: Discord Webhooks (FREE - Rich Mobile Push)
Create a secure logging Discord channel to receive instant space weather warnings:
1. Open your Discord server, right-click on the alert channel and select **Edit Channel ➡️ Integrations**.
2. Click **Create Webhook**, customize its avatar, and select **Copy Webhook URL**.
3. Map this directly to your environment variables:
   ```env
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxxx/yyyyyy
   ```

### Option C: Slack Integration (FREE)
For corporate workflows, publish critical space alerts straight to standard workspace channels:
1. Go to your Slack API console, select your workspace, and enable **Incoming Webhooks**.
2. Create a channel webhook and copy its secure link:
   ```env
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
   ```

---

## 💬 4. Twilio SMS Configuration (Paid Service - Optional)
If you specifically need traditional cellular SMS and have a registered development budget, you can configure Twilio:
1. Register for an account at [Twilio.com](https://www.twilio.com/).
2. Pull your Credentials block from the active account dashboard:
   ```env
   TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   TWILIO_AUTH_TOKEN=your_secret_auth_token_string
   TWILIO_PHONE_NUMBER=+1234567890
   ```

---

## ⚙️ 5. Unified Environment Variables blueprint (`.env` setup)

Add these secret bindings into your container dashboard secrets or create/update your local `.env` configuration file in the project root:

```env
# =========================================================================
# ISRO ASTROSHIELD PRODUCTION NOTIFICATION SYSTEM SECRETS
# =========================================================================

# 1. SMTP Mail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=abujarnadaf001@gmail.com
SMTP_PASS=your_gmail_app_password_here
SMTP_FROM="ISRO Space Physics Lab <abujarnadaf001@gmail.com>"

# 2. Twilio SMS Configuration (Paid - Optional)
TWILIO_ACCOUNT_SID=ACabcdef1234567890abcdef1234567890
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# 3. 100% Free Comm Channels (No Card Required - Highly Recommended!)
TELEGRAM_BOT_TOKEN=7482390422:AAHGf_xxxxx_your_telegram_bot_token
TELEGRAM_CHAT_ID=-1002345678901
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxxx/yyyyyy
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 💻 5. Multi-Channel Payload Templates

The notifications generated by the back-end automatically attach direct measurements and predicted flux factors for immediate understanding:

### 📱 Real-Time SMS Waveform
```text
🚨 ISRO ASTROSHIELD ALERTS
STATION: VSSC SPL
TARGET: GSAT-31 (83° E)
STATUS: CRITICAL EXCURSION WARNING

Magnetopause Boundary: 6.22 Re (COLLAPSED past geosynchronous limit of 6.6 Re!)
SW velocity: 780 km/s
IMF Bz: -12.5 nT
Solar Plasma: 32.0 cm⁻³
Dynamic Pressure: 15.65 nPa

FORECAST MATRIX RADIATION RISK:
- T+30M: 42562 p/cm²·s·sr (CRITICAL)
- T+6H: 31200 p/cm²·s·sr (HIGH)
- T+12H: 18500 p/cm²·s·sr (MODERATE)

ALERT CAUSE: Standoff boundary compressed past 6.6 Re exposing spacecraft to direct solar magnetosheath flux and deep dielectric charging hazards! Initiate charge dissipaters.
```

### 📧 High-Priority Mail Waveform
**Subject:** `⚠️ CRITICAL: ISRO Space Weather Geostationary Excursion Alert - GSAT-31 (83°E)`
> **Dear Authorized Space Operations Scientist/Officer,**
>
> This is an automated alert generated by the ISRO Space Physics Laboratory (SPL) AstroShield monitoring system. The planet-scale empirical magnetopause standoff boundary has compressed past the critical geostationary orbit ceiling.
>
> **Computed Boundary Standoff:** `6.224 Re` (Critical < 6.6 Re)
> - Current SW Velocity (Vsw): `780 km/s`
> - IMF North-South Component (Bz): `-12.5 nT`
> - Dynamic Radiation Pressure: `15.642 nPa`
>
> **Predictive Flux Trends:**
> - 30 min forecast: `42562 units (CRITICAL)`
> - 6 Hr forecast: `31200 units (HIGH)`
> - 12 Hr forecast: `18500 units (MODERATE)`
>
> This email has high-priority status. Real-time telemetry compiled via AstroShield VSSC Server node.

---

## 🧪 6. Testing & Operational Verification

1. Double-click the **CME Solar Storm** preset on your active Space Weather Desktop to drive standoff parameters deep into the warning threshold.
2. In the **ALERT MONITOR & RECIPIENTS** desktop panel, you will see a bright warning red state immediately flash active.
3. Toggle on **Autopilot Alerts Dispatching** so compressions automatically trigger real-time multi-channel dispatches, or click **Dispatch Alerts Now** to manually command the system.
4. View real-time output stream updates in the **Telemetry Control Console** at the bottom of the screen.
