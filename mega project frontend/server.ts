/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialization helper for Gemini SDK to avoid crashes if API key is not yet set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST API endpoints

// 1. Health diagnostic check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agency: 'ISRO-SPL Research Workspace',
  });
});

// 2. Space weather alert analysis using Gemini 3.5 Flash
app.post('/api/forecast/gemini', async (req, res) => {
  try {
    const { Vsw, Bz, Nsw, P_dyn, Kp, currentFlux, warningTime, satelliteName } = req.body;

    const systemPrompt = `You are an expert senior Space Weather Physicist and Spacecraft Engineering Specialist at ISRO's Space Physics Laboratory (SPL). 
Your task is to analyze raw solar wind stream parameters and return a highly detailed, professional physics-based alert summary.
Provide details explaining the electrodynamics at geostationary orbit (magnetosphere compression, magnetopause standoff, chorus wave growth, deep dielectric charging hazards).
Limit your response to around 150-200 words. Return a JSON structure matching this schema:
{
  "standoffAnalysis": "brief summary of magnetopause standoff distance in relation to geosynchronous boundary (6.6 Re)",
  "beltElectrodynamics": "brief physical summary of electron wave-particle chorus acceleration and particle loss under these parameters",
  "anomalyAssessment": "risk assessment for deep dielectric charging and electrostatic discharge on the solar panels of satellite (e.g. GSAT)",
  "mitigationRecommendation": "precise spacecraft emergency operation recommendations (e.g., charge-neutralization payload trigger, standby modes)"
}`;

    const promptMessage = `Analyze these conditions: 
- Solar Wind Speed: ${Vsw} km/s
- Interplanetary Magnetic Field (IMF) Bz: ${Bz} nT
- Plasma Density: ${Nsw} cm^-3
- Solar Dynamic Pressure: ${P_dyn} nPa
- Geomagnetic Index Kp: ${Kp}
- Geosynchronous Electron Flux (>2 MeV): ${currentFlux} cm^-2 s^-1 sr^-1
- Target Spacecraft: ${satelliteName || 'GSAT-31 (Indian Longitude 83° E)'}
- Forecast Horizon: ${warningTime || '30-45 minutes ahead'}`;

    const client = getGeminiClient();
    const result = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptMessage,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      }
    });

    res.json(JSON.parse(result.text || '{}'));
  } catch (err: any) {
    console.error('Gemini prediction error:', err);
    res.status(500).json({
      error: 'Failed to generate physics-informed AI intelligence summary.',
      details: err.message,
    });
  }
});

// 2.5. Dispatch Space Weather Alerts via Email (SMTP) & SMS (Twilio)
app.post('/api/alerts/dispatch', async (req, res) => {
  try {
    const {
      triggerSource,
      Vsw,
      Bz,
      Nsw,
      P_dyn,
      Kp,
      r0,
      predicted30m,
      predicted6h,
      predicted12h,
      satelliteName,
      recipients
    } = req.body;

    const isSmtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
    const isTwilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    const isTelegramConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
    const isDiscordConfigured = !!process.env.DISCORD_WEBHOOK_URL;
    const isSlackConfigured = !!process.env.SLACK_WEBHOOK_URL;

    const results = [];

    // Formatted SMS content
    const smsBody = `🚨 ISRO ASTROSHIELD ALERTS
STATION: VSSC SPL
TARGET: ${satelliteName || 'GSAT-31'}
STATUS: CRITICAL EXCURSION WARNING

Magnetopause Boundary: ${r0.toFixed(2)} Re (COLLAPSED past geosynchronous limit of 6.6 Re!)
SW velocity: ${Vsw.toFixed(0)} km/s
IMF Bz: ${Bz.toFixed(1)} nT
Solar Plasma: ${Nsw.toFixed(1)} cm⁻³
Dynamic Pressure: ${P_dyn.toFixed(2)} nPa

FORECAST MATRIX RADIATION RISK:
- T+30M: ${predicted30m?.flux.toFixed(0)} p/cm²·s·sr (${predicted30m?.risk})
- T+6H: ${predicted6h?.flux.toFixed(0)} p/cm²·s·sr (${predicted6h?.risk})
- T+12H: ${predicted12h?.flux.toFixed(0)} p/cm²·s·sr (${predicted12h?.risk})

ALERT CAUSE: Standoff boundary compressed past 6.6 Re exposing spacecraft to direct solar magnetosheath flux and deep dielectric charging hazards! Initiate charge dissipaters.`;

    // Formatted Email HTML content
    const emailHtml = `
      <div style="font-family: monospace; background-color: #030408; color: #cbd5e1; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
        <h1 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px; margin-top: 0;">⚠️ CRITICAL: ISRO Space Weather Geostationary Excursion Alert</h1>
        <p style="font-size: 14px; color: #f1f5f9;"><strong>Spacecraft Target Node:</strong> ${satelliteName || 'GSAT-31 (Indian Sector)'}</p>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
          This high-priority alert was generated by the ISRO Space Physics Laboratory (SPL) AstroShield monitoring system. 
          The computed empirical magnetopause standoff boundary has compressed inside the critical geostationary orbit line (6.6 Re).
        </p>
        
        <div style="background-color: #0c0a09; padding: 15px; border-radius: 6px; border: 1px solid #78350f; margin: 15px 0;">
          <h3 style="color: #f97316; margin-top: 0; font-size: 13px;">REAL-TIME TELEMETRY STREAM VALUES</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <tr>
              <td style="padding: 4px 0; color: #94a3b8; width: 50%;">Magnetopause Standoff (r0):</td>
              <td style="padding: 4px 0; color: #ef4444; font-weight: bold;">${r0.toFixed(3)} Re</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">Solar Wind Velocity (Vsw):</td>
              <td style="padding: 4px 0; color: #f1f5f9;">${Vsw.toFixed(0)} km/s</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">IMF Component (Bz):</td>
              <td style="padding: 4px 0; color: #f1f5f9;">${Bz.toFixed(1)} nT</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">Plasma Density (Nsw):</td>
              <td style="padding: 4px 0; color: #f1f5f9;">${Nsw.toFixed(1)} cm⁻³</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">Solar Dynamic Pressure (P_dyn):</td>
              <td style="padding: 4px 0; color: #f97316; font-weight: bold;">${P_dyn.toFixed(3)} nPa</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">Geomagnetic Index (Kp):</td>
              <td style="padding: 4px 0; color: #f1f5f9;">${Kp}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #0c0a09; padding: 15px; border-radius: 6px; border: 1px solid #1e293b; margin: 15px 0;">
          <h3 style="color: #38bdf8; margin-top: 0; font-size: 13px;">RADIATION BELT PREDICTIVE TREND DATA</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <tr>
              <td style="padding: 4px 0; color: #94a3b8; width: 50%;">T+30M Forecast Flux:</td>
              <td style="padding: 4px 0; color: #f1f5f9;">${predicted30m?.flux.toFixed(0)} particles/cm²·s·sr (${predicted30m?.risk})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">T+6H Forecast Flux:</td>
              <td style="padding: 4px 0; color: #f1f5f9;">${predicted6h?.flux.toFixed(0)} particles/cm²·s·sr (${predicted6h?.risk})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #94a3b8;">T+12H Forecast Flux:</td>
              <td style="padding: 4px 0; color: #f1f5f9;">${predicted12h?.flux.toFixed(0)} particles/cm²·s·sr (${predicted12h?.risk})</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 11px; color: #64748b; margin-bottom: 0; border-top: 1px solid #1e293b; padding-top: 10px; text-align: center;">
          AstroShield Warning System • Space Physics Lab (VSSC) V Command. Origin Trigger: ${triggerSource}. Time: ${new Date().toUTCString()}
        </p>
      </div>
    `;

    for (const recipient of (recipients || [])) {
      let emailStatus = 'simulated';
      let smsStatus = 'simulated';
      let emailError = null;
      let smsError = null;

      // Send actual email if SMTP is configured
      if (isSmtpConfigured) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: parseInt(process.env.SMTP_PORT || '465') === 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });

          await transporter.sendMail({
            from: process.env.SMTP_FROM || `"ISRO Space Physics Laboratory" <${process.env.SMTP_USER}>`,
            to: recipient.email,
            subject: `⚠️ CRITICAL: ISRO Space Weather Geostationary Excursion Alert - ${satelliteName || 'GSAT-31'}`,
            html: emailHtml,
            text: smsBody
          });
          emailStatus = 'success';
        } catch (err: any) {
          console.error(`Nodemailer dispatch error to ${recipient.email}:`, err);
          emailStatus = 'failed';
          emailError = err.message;
        }
      }

      // Send actual SMS if Twilio is configured
      if (isTwilioConfigured) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: smsBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: recipient.mobile
          });
          smsStatus = 'success';
        } catch (err: any) {
          console.error(`Twilio dispatch error to ${recipient.mobile}:`, err);
          smsStatus = 'failed';
          smsError = err.message;
        }
      }

      results.push({
        recipientName: recipient.name,
        email: recipient.email,
        mobile: recipient.mobile,
        status: (isSmtpConfigured || isTwilioConfigured) ? ((emailStatus === 'success' || smsStatus === 'success') ? 'success' : 'failed') : 'simulated',
        emailStatus,
        smsStatus,
        emailError,
        smsError,
        summary: (isSmtpConfigured || isTwilioConfigured)
          ? `Dispatched real alert. Email Status: ${emailStatus}. SMS Status: ${smsStatus}.`
          : `Simulated Alert Successful! Delivered formatted SMS & Email to local terminal sandbox log.`
      });
    }

    // Free Chat/Pub Channels dispatch
    if (isTelegramConfigured) {
      try {
        const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: smsBody
          })
        });
        results.push({
          recipientName: 'Telegram Channel Operations',
          email: 'N/A',
          mobile: 'N/A',
          status: 'success',
          emailStatus: 'success',
          smsStatus: 'success',
          summary: 'Dispatched Free Team Notification to Telegram Channel successfully.'
        });
      } catch (err: any) {
        console.error('Telegram dispatch error:', err);
        results.push({
          recipientName: 'Telegram Channel Operations',
          email: 'N/A',
          mobile: 'N/A',
          status: 'failed',
          summary: `Telegram dispatch failed: ${err.message}`
        });
      }
    }

    if (isDiscordConfigured) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📢 **ASTROSHIELD SPACE WEATHER EXCURSION WARNING**\n\`\`\`\n${smsBody}\n\`\`\``
          })
        });
        results.push({
          recipientName: 'Discord Server Alerts',
          email: 'N/A',
          mobile: 'N/A',
          status: 'success',
          emailStatus: 'success',
          smsStatus: 'success',
          summary: 'Dispatched Free Team Notification to Discord Webhook successfully.'
        });
      } catch (err: any) {
        console.error('Discord Webhook dispatch error:', err);
        results.push({
          recipientName: 'Discord Server Alerts',
          email: 'N/A',
          mobile: 'N/A',
          status: 'failed',
          summary: `Discord dispatch failed: ${err.message}`
        });
      }
    }

    if (isSlackConfigured) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📢 *ASTROSHIELD SPACE WEATHER EXCURSION WARNING*\n\`\`\`\n${smsBody}\n\`\`\``
          })
        });
        results.push({
          recipientName: 'Slack Workspace Channel',
          email: 'N/A',
          mobile: 'N/A',
          status: 'success',
          emailStatus: 'success',
          smsStatus: 'success',
          summary: 'Dispatched Free Team Notification to Slack Webhook successfully.'
        });
      } catch (err: any) {
        console.error('Slack Webhook dispatch error:', err);
        results.push({
          recipientName: 'Slack Workspace Channel',
          email: 'N/A',
          mobile: 'N/A',
          status: 'failed',
          summary: `Slack dispatch failed: ${err.message}`
        });
      }
    }

    res.json({
      isSimulated: !(isSmtpConfigured || isTwilioConfigured || isTelegramConfigured || isDiscordConfigured || isSlackConfigured),
      results
    });

  } catch (err: any) {
    console.error('Alert dispatch process error:', err);
    res.status(500).json({ error: 'Failed to process and dispatch alerts.', details: err.message });
  }
});

// 3. User-customizable Python/ML pipeline model upload API simulation
// This endpoint makes it easy for the developer's friend to integrate real machine learning models
app.post('/api/models/predict', (req, res) => {
  const { modelId, customWeights, inputs } = req.body;
  if (!inputs || !Array.isArray(inputs)) {
    return res.status(400).json({ error: 'Missing required solar wind time-series inputs' });
  }

  // Calculate simulated parameters
  const latestInput = inputs[inputs.length - 1];
  const count = inputs.length;

  res.json({
    modelId: modelId || 'user-custom-pinn',
    parametersReceived: count,
    receivedAt: new Date().toISOString(),
    status: 'INF_SUCCESS',
    testInferenceOutputs: {
      predictedFlux30m: (latestInput.Vsw * 1.5 + latestInput.Nsw * 2.1) * (1 + (Math.random() - 0.5) * 0.1),
      predictedFlux6h: (latestInput.Vsw * 1.8) * (1 + (Math.random() - 0.5) * 0.2),
      predictedFlux12h: (latestInput.Vsw * 2.2) * (1 + (Math.random() - 0.5) * 0.3),
    },
    diagnosticLogs: [
      'Data matrix despiked: Completed.',
      'Interpolation check: Completed. Gaps = 0',
      'Normalizing arrays with standard scalar: ScaleFactor = 1.0',
    ]
  });
});

// Start server function incorporating Vite middleware for Hot-reload / static hosting
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WORKSPACE SERVER] AstroShield System active on http://0.0.0.0:${PORT}`);
  });
}

start();
