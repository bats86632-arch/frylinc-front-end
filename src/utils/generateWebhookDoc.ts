import { WebhookRecord } from "../types";

export const generateWebhookDoc = (webhook: WebhookRecord, orgName: string, actualSecret?: string) => {
  const finalSecret = actualSecret || webhook.secret;
  const displayedSecret = finalSecret || "whsec_••••••••••••••••••••••••";
  const eventsList = webhook.events && webhook.events.length > 0 ? webhook.events.join(", ") : "ALL";

  const htmlContent = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; background-color: #ffffff; line-height: 1.6; font-size: 12px; padding: 40px; box-sizing: border-box;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="font-size: 24px; color: #dc2626; margin: 0; font-weight: bold;">Fyrlinc Webhook Integration Manual</h1>
        <span style="background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 11px;">REAL-TIME EVENT STREAM</span>
      </div>

      <!-- Real-Time vs Polling Banner -->
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin-bottom: 24px;">
        <strong style="color: #166534; font-size: 13px; display: block; margin-bottom: 4px;">⚡ Real-Time Push vs REST API Polling:</strong>
        <p style="margin: 0; color: #15803d; font-size: 12px;">
          <strong>Webhooks automatically stream event data to your endpoint the instant it happens</strong> (sub-second latency for fire alarms, panel trouble, and telemetry pings). 
          Unlike the REST API which requires scheduled polling and repeated network requests, your webhook receiver is pushed notifications reactively with zero polling overhead.
        </p>
      </div>
      
      <!-- Metadata Box -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 4px 0; color: #4b5563; width: 140px; font-weight: 600;">Organization:</td>
            <td style="padding: 4px 0; color: #111827; font-weight: 600;">${orgName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563; font-weight: 600;">Webhook ID:</td>
            <td style="padding: 4px 0; font-family: monospace; color: #111827;">${webhook.id}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563; font-weight: 600;">Target Endpoint URL:</td>
            <td style="padding: 4px 0; font-family: monospace; color: #1d4ed8; word-break: break-all;">${webhook.url}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563; font-weight: 600;">Subscribed Events:</td>
            <td style="padding: 4px 0; color: #111827;"><span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px;">${eventsList}</span></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563; font-weight: 600;">Branch Scope:</td>
            <td style="padding: 4px 0; color: #111827;">${webhook.branchIds && webhook.branchIds.length > 0 ? webhook.branchIds.join(", ") : "All Branches (Global within Org)"}</td>
          </tr>
        </table>
      </div>

      <!-- Secret Box -->
      <div style="background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; padding: 15px; margin-bottom: 30px; color: #991b1b;">
        <strong style="display: block; margin-bottom: 6px; font-size: 12px;">WEBHOOK SIGNING SECRET (KEEP STRICTLY CONFIDENTIAL):</strong>
        <code style="background: #ffffff; color: #991b1b; font-size: 13px; font-family: 'Courier New', Courier, monospace; padding: 6px 10px; border-radius: 4px; border: 1px solid #fca5a5; display: block; word-break: break-all; margin-top: 4px;">${displayedSecret}</code>
        <p style="margin: 8px 0 0 0; font-size: 11px; opacity: 0.9;">
          Use this secret to verify the HMAC-SHA256 signature in the <code style="font-family: monospace;">x-fyrlinc-signature</code> header of every incoming delivery. Never commit this secret to public code repositories.
        </p>
      </div>

      <!-- Section 1: Security & Signature Verification -->
      <h2 style="font-size: 16px; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; color: #111827; font-weight: bold;">1. Security & Signature Verification</h2>
      <p style="margin-bottom: 10px;">
        To ensure request authenticity and protect against forgery and replay attacks, Fyrlinc signs every webhook HTTP POST payload with an HMAC-SHA256 signature.
      </p>

      <strong style="color: #374151; display: block; margin-top: 15px; margin-bottom: 6px;">Incoming HTTP Headers:</strong>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.5; margin-bottom: 15px;"><code>Content-Type: application/json
User-Agent: Fyrlinc-Webhooks/1.0
x-fyrlinc-signature: 8f3b... [Hex-encoded HMAC-SHA256 of raw JSON body using secret]
x-fyrlinc-event: ALARM_TRIGGERED
x-fyrlinc-timestamp: 1787508492 [Unix timestamp in seconds]</code></pre>

      <h3 style="font-size: 13px; margin-top: 20px; color: #1f2937; font-weight: bold;">Verification Code Examples</h3>

      <!-- Node.js Verification -->
      <p style="margin: 8px 0 4px 0; font-weight: 600; color: #374151;">Node.js / Express Example:</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>const crypto = require('crypto');
const express = require('express');
const app = express();

// Important: Raw body buffer required for accurate signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-fyrlinc-signature'];
  const timestamp = req.headers['x-fyrlinc-timestamp'];
  const event = req.headers['x-fyrlinc-event'];
  const secret = process.env.FYRLINC_WEBHOOK_SECRET || '${displayedSecret}';

  // Prevent replay attacks (reject if older than 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return res.status(400).send('Timestamp out of allowed window');
  }

  const computedSig = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSig))) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body.toString('utf8'));
  console.log('Received valid Fyrlinc event:', event, payload);

  // Return 200 OK promptly
  res.status(200).json({ received: true });
});</code></pre>

      <!-- Python Verification -->
      <p style="margin: 12px 0 4px 0; font-weight: 600; color: #374151;">Python / Flask Example:</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>import hmac, hashlib, time
from flask import Flask, request, jsonify, abort

app = Flask(__name__)
SECRET = "${displayedSecret}".encode('utf-8')

@app.route('/webhook', methods=['POST'])
def fyrlinc_webhook():
    sig = request.headers.get('x-fyrlinc-signature', '')
    timestamp = int(request.headers.get('x-fyrlinc-timestamp', 0))

    if abs(time.time() - timestamp) > 300:
        abort(400, "Replay attack detected: Timestamp expired")

    computed = hmac.new(SECRET, request.get_data(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, computed):
        abort(401, "Invalid webhook signature")

    payload = request.get_json()
    event_type = request.headers.get('x-fyrlinc-event')
    print(f"Verified event: {event_type} - Serial: {payload.get('data', {}).get('serial')}")

    return jsonify({"status": "acknowledged"}), 200</code></pre>

      <!-- PHP Verification -->
      <p style="margin: 12px 0 4px 0; font-weight: 600; color: #374151;">PHP Example:</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>&lt;?php
$secret = '${displayedSecret}';
$signature = $_SERVER['HTTP_X_FYRLINC_SIGNATURE'] ?? '';
$timestamp = intval($_SERVER['HTTP_X_FYRLINC_TIMESTAMP'] ?? 0);
$rawPayload = file_get_contents('php://input');

if (abs(time() - $timestamp) > 300) {
    http_response_code(400);
    exit('Timestamp expired');
}

$expected = hash_hmac('sha256', $rawPayload, $secret);
if (!hash_equals($signature, $expected)) {
    http_response_code(401);
    exit('Invalid signature');
}

$data = json_decode($rawPayload, true);
http_response_code(200);
echo json_encode(['received' => true]);</code></pre>

      <div style="page-break-before: always;"></div>

      <!-- Section 2: Event Catalogs & Payload Specifications -->
      <h2 style="font-size: 16px; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; color: #111827; font-weight: bold;">2. Event Catalog & Payload Specifications</h2>

      <h3 style="font-size: 13px; margin-top: 20px; color: #dc2626; font-weight: bold;">Event: ALARM_TRIGGERED</h3>
      <p style="margin-bottom: 6px;">Dispatched immediately when an active fire alarm, manual pull station, or smoke detector triggers on any panel in your scope.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>{
  "id": "evt_9a4f2e08b17c",
  "event": "ALARM_TRIGGERED",
  "timestamp": "2026-09-23T16:40:00.124Z",
  "companyId": "${webhook.companyId || "comp_123"}",
  "branchId": "branch_north_facility",
  "data": {
    "serial": "P-219111",
    "panelName": "Warehouse 4 Fire Panel",
    "alarm": true,
    "panelType": "Fire Alarm",
    "zones": [1, 2, 1, 1, 1, 1, 1, 1],
    "triggeredZones": [2],
    "zoneStatus": {
      "zone1": "Normal",
      "zone2": "FIRE_ALARM",
      "zone3": "Normal"
    },
    "ipAddress": "192.168.1.105",
    "rawString": "219111$1$2$1$1$1$1$1$1"
  }
}</code></pre>

      <h3 style="font-size: 13px; margin-top: 20px; color: #059669; font-weight: bold;">Event: ALARM_RESOLVED</h3>
      <p style="margin-bottom: 6px;">Dispatched when a panel zone alarm is resolved, cleared, or silenced via hardware key or ZONE OFF command.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>{
  "id": "evt_7c1d3a5e2f09",
  "event": "ALARM_RESOLVED",
  "timestamp": "2026-09-23T16:45:10.880Z",
  "companyId": "${webhook.companyId || "comp_123"}",
  "branchId": "branch_north_facility",
  "data": {
    "serial": "P-219111",
    "zoneIndex": 1,
    "alarm": false,
    "resolvedBy": "operator@acmecorp.com",
    "resolvedVia": "ZONE OFF command"
  }
}</code></pre>

      <h3 style="font-size: 13px; margin-top: 20px; color: #2563eb; font-weight: bold;">Event: TELEMETRY_UPDATE</h3>
      <p style="margin-bottom: 6px;">Periodic telemetry heartbeat ping from panel hardware with full zone health matrix.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>{
  "id": "evt_3d5a7b9c1e2f",
  "event": "TELEMETRY_UPDATE",
  "timestamp": "2026-09-23T16:50:00.000Z",
  "companyId": "${webhook.companyId || "comp_123"}",
  "branchId": "branch_north_facility",
  "data": {
    "serial": "P-219111",
    "panelType": "Fire Alarm",
    "alarm": false,
    "zones": [1, 1, 1, 1, 1, 1, 1, 1],
    "signalQuality": 95,
    "batteryVoltage": 12.6,
    "acPower": true
  }
}</code></pre>

      <h3 style="font-size: 13px; margin-top: 20px; color: #d97706; font-weight: bold;">Event: PANEL_STATUS_CHANGED</h3>
      <p style="margin-bottom: 6px;">Dispatched when a panel goes offline, comes online, or has its configuration altered.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>{
  "id": "evt_4b6c8d0e2f1a",
  "event": "PANEL_STATUS_CHANGED",
  "timestamp": "2026-09-23T16:52:30.000Z",
  "companyId": "${webhook.companyId || "comp_123"}",
  "branchId": "branch_north_facility",
  "data": {
    "serial": "P-219111",
    "online": true,
    "lastSeen": "2026-09-23T16:52:29.000Z",
    "changes": {
      "ipAddress": "192.168.1.106"
    }
  }
}</code></pre>

      <h3 style="font-size: 13px; margin-top: 20px; color: #4b5563; font-weight: bold;">Event: test.ping</h3>
      <p style="margin-bottom: 6px;">Synthetic connectivity test sent when clicking "Test Webhook" in the Fyrlinc dashboard.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; overflow-x: auto;"><code>{
  "id": "evt_test_7f8a9b",
  "event": "test.ping",
  "timestamp": "2026-09-23T16:55:00.000Z",
  "data": {
    "message": "Fyrlinc real-time webhook ping test",
    "serial": "TEST-PANEL-01",
    "status": "operational"
  }
}</code></pre>

      <div style="page-break-before: always;"></div>

      <!-- Section 3: Delivery Guarantees & Retry Policy -->
      <h2 style="font-size: 16px; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; color: #111827; font-weight: bold;">3. Delivery Guarantees & Retry Policy</h2>
      
      <div style="margin-top: 15px;">
        <p><strong>Response Time:</strong> Your receiver must return an HTTP status code between <strong>200 and 299</strong> within <strong>5 seconds</strong> of receiving the POST request. Heavy background processing (e.g. sending SMS, invoking ERP systems) should be queued asynchronously after acknowledging 200 OK.</p>

        <p><strong>Retry Schedule (Exponential Backoff):</strong> If your endpoint returns a non-2xx status code or times out, Fyrlinc will automatically retry delivery according to this backoff schedule:</p>
        <ul style="padding-left: 20px; margin: 8px 0 15px 0;">
          <li><strong>Attempt 1:</strong> Immediate (0s)</li>
          <li><strong>Attempt 2:</strong> +15 seconds</li>
          <li><strong>Attempt 3:</strong> +1 minute</li>
          <li><strong>Attempt 4:</strong> +5 minutes</li>
          <li><strong>Attempt 5:</strong> +15 minutes</li>
        </ul>

        <p><strong>Idempotency:</strong> Because network glitches may occasionally cause retries, your application should track the unique <code style="font-family: monospace;">id</code> field in each payload to prevent duplicate processing of the same event.</p>
      </div>

      <!-- Section 4: Webhook vs REST API Summary -->
      <h2 style="font-size: 16px; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; color: #111827; font-weight: bold;">4. Webhooks vs REST APIs At A Glance</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Feature</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; color: #15803d;">Webhooks (Real-Time Stream)</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; color: #3b82f6;">REST API (x-api-key)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Data Delivery</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; color: #15803d;">Automatic Push (Event-Driven)</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Manual Pull (Polling Required)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Alarm Latency</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; color: #15803d;">Instant (&lt; 500ms)</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Delayed (Depends on polling interval)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Server Load</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; color: #15803d;">Zero wasteful requests</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">High API call volume if frequent</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">Primary Use Case</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; color: #15803d;">Emergency alarms, incident response, live status</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Historical reports, panel setup, command dispatch</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; pt-4">
        Generated on ${new Date().toLocaleString()} for ${orgName}. Fyrlinc Fire & Safety Systems. Confidential.
      </div>
    </div>
  `;

  if (typeof window === "undefined") {
    return;
  }

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Fyrlinc_Webhook_Manual_${(webhook.description || webhook.id).replace(/\s+/g, '_')}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; -webkit-print-color-adjust: exact; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    console.error("Popup blocked. Could not open print window.");
  }
};
