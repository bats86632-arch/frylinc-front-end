import html2pdf from "html2pdf.js";
import { ApiKeyRecord } from "../types";

export const generateApiKeyDoc = (apiKey: ApiKeyRecord, orgName: string, actualKey?: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://api.yourdomain.com";
  const displayedKey = actualKey || `YOUR_SECRET_API_KEY (Ending in ${apiKey.last4})`;

  const htmlContent = `
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #1f2937;
        line-height: 1.6;
        font-size: 14px;
        margin: 0;
        padding: 40px;
      }
      h1, h2, h3, h4 { color: #111827; }
      h1 { font-size: 28px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; color: #dc2626; }
      h2 { font-size: 20px; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
      h3 { font-size: 16px; margin-top: 20px; color: #374151; }
      .meta-box {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 30px;
      }
      .meta-box strong { color: #4b5563; }
      .secret-box {
        background: #fee2e2;
        border: 1px solid #f87171;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 30px;
        color: #991b1b;
      }
      pre {
        background: #1e293b;
        color: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        overflow-x: auto;
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 1.4;
      }
      code {
        background: #f1f5f9;
        color: #0f172a;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        margin-bottom: 30px;
        font-size: 13px;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 10px;
        text-align: left;
      }
      th { background-color: #f9fafb; font-weight: bold; }
      .page-break { page-break-before: always; }
      .footer { margin-top: 50px; font-size: 11px; color: #9ca3af; text-align: center; }
    </style>
    
    <div id="pdf-content">
      <h1>Fyrlinc API Integration Manual</h1>
      
      <div class="meta-box">
        <p><strong>Organization:</strong> ${orgName}</p>
        <p><strong>Key Label:</strong> ${apiKey.label}</p>
        <p><strong>Key ID:</strong> ${apiKey.id}</p>
        <p><strong>Permissions:</strong> ${apiKey.branchIds?.length ? "Scoped to specific branches" : "Global Scope"}</p>
        ${apiKey.webhookUrl ? `<p><strong>Configured Webhook:</strong> ${apiKey.webhookUrl}</p>` : ""}
      </div>

      ${actualKey ? `
      <div class="secret-box">
        <strong>YOUR SECRET API KEY (DO NOT SHARE):</strong><br/>
        <code style="background: transparent; color: #991b1b; font-size: 16px;">${actualKey}</code>
      </div>
      ` : ""}

      <h2>1. Authentication</h2>
      <p>All API requests must be authenticated using the <code>x-api-key</code> HTTP header.</p>
      <pre><code>Authorization-Header:
x-api-key: ${displayedKey}</code></pre>

      <div class="page-break"></div>

      <h2>2. Endpoints Overview</h2>

      <h3>GET /panels</h3>
      <p>Retrieves a list of all fire panels scoped to your API key.</p>
      <pre><code>curl -X GET "${baseUrl}/panels" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>
      
      <strong>Response Format:</strong>
      <pre><code>{
  "panels": [
    {
      "serial": "P001",
      "name": "Main Building Panel",
      "model": "X-1000",
      "status": "online",
      "lastPing": "2026-07-09T10:00:00Z"
    }
  ]
}</code></pre>

      <h3>GET /panels/:serial</h3>
      <p>Retrieves detailed information, including active alarms and zones, for a specific panel.</p>
      <pre><code>curl -X GET "${baseUrl}/panels/P001" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>

      <h3>PATCH /panels/:serial</h3>
      <p>Updates the mutable fields of a specific panel.</p>
      <pre><code>curl -X PATCH "${baseUrl}/panels/P001" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Updated Panel Name",
    "coordinates": { "lat": 40.7128, "lng": -74.0060 }
  }'</code></pre>

      <div class="page-break"></div>

      <h3>GET /branches</h3>
      <p>Retrieves a list of branches (facilities/locations) associated with the organization.</p>
      <pre><code>curl -X GET "${baseUrl}/branches" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>

      <h3>GET /audit-logs</h3>
      <p>Retrieves system audit logs. Useful for compliance monitoring.</p>
      <pre><code>curl -X GET "${baseUrl}/audit-logs" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>

      <h2>3. Webhook Integration</h2>
      <p>If you have configured a webhook URL for this API key, Fyrlinc will automatically push real-time events to your endpoint via HTTP POST. You must respond with a 2xx status code.</p>
      
      <strong>Payload Format:</strong>
      <pre><code>{
  "event": "ALARM_TRIGGERED",
  "panelSerial": "P001",
  "companyId": "${apiKey.companyId || 'company_id'}",
  "timestamp": "2026-07-09T10:00:00Z",
  "data": {
    "zoneId": "Z01",
    "description": "Smoke detected in lobby"
  }
}</code></pre>

      <strong>Common Event Types:</strong>
      <table>
        <thead>
          <tr>
            <th>Event Code</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>PANEL_ONLINE</code></td>
            <td>Emitted when a panel connects to the network.</td>
          </tr>
          <tr>
            <td><code>PANEL_OFFLINE</code></td>
            <td>Emitted when a panel stops responding to heartbeats.</td>
          </tr>
          <tr>
            <td><code>ALARM_TRIGGERED</code></td>
            <td>Emitted when a fire, smoke, or fault alarm is activated.</td>
          </tr>
          <tr>
            <td><code>ALARM_CLEARED</code></td>
            <td>Emitted when an alarm state is restored to normal.</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        Generated on ${new Date().toLocaleString()} for ${orgName}. Confidential.
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  const opt = {
    margin:       10,
    filename:     `Fyrlinc_API_Manual_${apiKey.label.replace(/\s+/g, '_')}_${apiKey.last4}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save().then(() => {
    document.body.removeChild(container);
  }).catch((err: any) => {
    console.error("PDF Generation Error", err);
    document.body.removeChild(container);
  });
};
