
import { ApiKeyRecord } from "../types";

export const generateApiKeyDoc = (apiKey: ApiKeyRecord, orgName: string, actualKey?: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://api.yourdomain.com";
  const finalActualKey = actualKey || apiKey.key;
  const displayedKey = finalActualKey || `YOUR_SECRET_API_KEY (Ending in ${apiKey.last4})`;

  const htmlContent = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; background-color: #ffffff; line-height: 1.6; font-size: 12px; padding: 40px; box-sizing: border-box;">
      <h1 style="font-size: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; color: #dc2626; margin-top: 0; font-weight: bold;">Fyrlinc API Integration Manual</h1>
      
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <p style="margin: 0 0 10px 0;"><strong style="color: #4b5563;">Organization:</strong> ${orgName}</p>
        <p style="margin: 0 0 10px 0;"><strong style="color: #4b5563;">Key Label:</strong> ${apiKey.label}</p>
        <p style="margin: 0 0 10px 0;"><strong style="color: #4b5563;">API Key:</strong> ${displayedKey}</p>
      </div>

      ${finalActualKey ? `
      <div style="background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; padding: 15px; margin-bottom: 30px; color: #991b1b;">
        <strong style="display: block; margin-bottom: 8px;">YOUR SECRET API KEY (DO NOT SHARE):</strong>
        <code style="background: transparent; color: #991b1b; font-size: 14px; font-family: 'Courier New', Courier, monospace; word-break: break-all;">${finalActualKey}</code>
      </div>
      ` : ""}

      <h2 style="font-size: 18px; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; color: #111827; font-weight: bold;">1. Authentication</h2>
      <p style="margin-bottom: 10px;">All API requests must be authenticated using the <code style="background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 13px;">x-api-key</code> HTTP header.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 10px; margin-bottom: 20px;"><code>Authorization-Header:
x-api-key: ${displayedKey}</code></pre>

      <div style="page-break-before: always;"></div>

      <h2 style="font-size: 18px; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; color: #111827; font-weight: bold;">2. Endpoints Overview</h2>

      <h3 style="font-size: 14px; margin-top: 25px; margin-bottom: 10px; color: #374151; font-weight: bold;">GET /panels</h3>
      <p style="margin-bottom: 10px;">Retrieves a list of all fire panels scoped to your API key.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 10px; margin-bottom: 15px;"><code>curl -X GET "${baseUrl}/panels" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>
      
      <strong style="color: #4b5563; display: block; margin-bottom: 8px;">Response Format:</strong>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 5px; margin-bottom: 20px;"><code>{
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

      <h3 style="font-size: 14px; margin-top: 25px; margin-bottom: 10px; color: #374151; font-weight: bold;">GET /panels/:serial</h3>
      <p style="margin-bottom: 10px;">Retrieves detailed information, including active alarms and zones, for a specific panel.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 10px; margin-bottom: 20px;"><code>curl -X GET "${baseUrl}/panels/P001" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>

      <h3 style="font-size: 14px; margin-top: 25px; margin-bottom: 10px; color: #374151; font-weight: bold;">PATCH /panels/:serial</h3>
      <p style="margin-bottom: 10px;">Updates the mutable fields of a specific panel.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 10px; margin-bottom: 20px;"><code>curl -X PATCH "${baseUrl}/panels/P001" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Updated Panel Name",
    "coordinates": { "lat": 40.7128, "lng": -74.0060 }
  }'</code></pre>

      <div style="page-break-before: always;"></div>

      <h3 style="font-size: 14px; margin-top: 25px; margin-bottom: 10px; color: #374151; font-weight: bold;">GET /branches</h3>
      <p style="margin-bottom: 10px;">Retrieves a list of branches (facilities/locations) associated with the organization.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 10px; margin-bottom: 20px;"><code>curl -X GET "${baseUrl}/branches" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>

      <h3 style="font-size: 14px; margin-top: 25px; margin-bottom: 10px; color: #374151; font-weight: bold;">GET /audit-logs</h3>
      <p style="margin-bottom: 10px;">Retrieves system audit logs. Useful for compliance monitoring.</p>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 10px; margin-bottom: 20px;"><code>curl -X GET "${baseUrl}/audit-logs" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json"</code></pre>

      <h3 style="font-size: 14px; margin-top: 25px; margin-bottom: 10px; color: #374151; font-weight: bold;">POST /panels/:serial/commands</h3>
      <p style="margin-bottom: 10px;">Pushes a command to a specific panel. Supported command formats:</p>
      <ul style="margin-bottom: 15px; padding-left: 20px; font-size: 13px;">
        <li style="margin-bottom: 5px;"><strong>ARM</strong>: Evacuate or trigger the alarm for the panel (e.g., <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace;">ARM</code>).</li>
        <li style="margin-bottom: 5px;"><strong>ZONE OFF</strong>: Silence or reset the panel (e.g., <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace;">ZONE OFF</code>).</li>
        <li style="margin-bottom: 5px;"><strong>MOB=&lt;slot&gt;=&lt;9 digits&gt;</strong>: Syncs a contact phone number to a specific slot (1-9). The phone number must be exactly 9 digits (e.g., <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace;">MOB=02=987654321</code>).</li>
      </ul>
      <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin-top: 10px; margin-bottom: 20px;"><code>curl -X POST "${baseUrl}/panels/P001/commands" \\
  -H "x-api-key: ${displayedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "command": "ARM"
  }'</code></pre>

      <div style="margin-top: 50px; font-size: 11px; color: #9ca3af; text-align: center;">
        Generated on ${new Date().toLocaleString()} for ${orgName}. Confidential.
      </div>
    </div>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Fyrlinc_API_Manual_${apiKey.label.replace(/\s+/g, '_')}_${apiKey.last4}</title>
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
