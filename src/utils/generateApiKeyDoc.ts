import html2pdf from "html2pdf.js";
import { ApiKeyRecord } from "../types";

export const generateApiKeyDoc = (apiKey: ApiKeyRecord, orgName: string, actualKey?: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://api.yourdomain.com";
  const displayedKey = actualKey || `YOUR_SECRET_API_KEY (Ending in ${apiKey.last4})`;

  const htmlContent = `
    <style>
      #pdf-content {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        color: #1f2937 !important;
        background-color: #ffffff !important;
        line-height: 1.6 !important;
        font-size: 14px !important;
        margin: 0 !important;
        padding: 40px !important;
      }
      #pdf-content h1, #pdf-content h2, #pdf-content h3, #pdf-content h4 { color: #111827 !important; }
      #pdf-content h1 { font-size: 28px !important; border-bottom: 2px solid #e5e7eb !important; padding-bottom: 10px !important; margin-bottom: 20px !important; color: #dc2626 !important; }
      #pdf-content h2 { font-size: 20px !important; margin-top: 30px !important; border-bottom: 1px solid #e5e7eb !important; padding-bottom: 5px !important; }
      #pdf-content h3 { font-size: 16px !important; margin-top: 20px !important; color: #374151 !important; }
      #pdf-content .meta-box {
        background: #f9fafb !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        padding: 20px !important;
        margin-bottom: 30px !important;
      }
      #pdf-content .meta-box strong { color: #4b5563 !important; }
      #pdf-content .secret-box {
        background: #fee2e2 !important;
        border: 1px solid #f87171 !important;
        border-radius: 8px !important;
        padding: 15px !important;
        margin-bottom: 30px !important;
        color: #991b1b !important;
      }
      #pdf-content p { color: #1f2937 !important; }
      #pdf-content pre {
        background: #1e293b !important;
        color: #f8fafc !important;
        padding: 15px !important;
        border-radius: 8px !important;
        overflow-x: auto !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 12px !important;
        line-height: 1.4 !important;
      }
      #pdf-content code {
        background: #f1f5f9 !important;
        color: #0f172a !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 13px !important;
      }
      #pdf-content table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 15px !important;
        margin-bottom: 30px !important;
        font-size: 13px !important;
      }
      #pdf-content th, #pdf-content td {
        border: 1px solid #e5e7eb !important;
        padding: 10px !important;
        text-align: left !important;
        color: #1f2937 !important;
      }
      #pdf-content th { background-color: #f9fafb !important; font-weight: bold !important; }
      #pdf-content .page-break { page-break-before: always !important; }
      #pdf-content .footer { margin-top: 50px !important; font-size: 11px !important; color: #9ca3af !important; text-align: center !important; }
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

  const opt = {
    margin:       10,
    filename:     `Fyrlinc_API_Manual_${apiKey.label.replace(/\s+/g, '_')}_${apiKey.last4}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(htmlContent).save().catch((err: any) => {
    console.error("PDF Generation Error", err);
  });
};
