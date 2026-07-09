import { jsPDF } from "jspdf";
import { ApiKeyRecord } from "../types";

export const generateApiKeyDoc = (apiKey: ApiKeyRecord, orgName: string, actualKey?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Colors and styling
  const primaryColor = [220, 38, 38]; // Red
  const textColor = [50, 50, 50];
  const secondaryTextColor = [100, 100, 100];
  
  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Fyrlinc API Documentation", 15, 17);

  // Document Title
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`API Integration Guide: ${orgName}`, 15, 40);
  
  // Basic Info Section
  doc.setFontSize(10);
  doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Key Name: ${apiKey.label}`, 15, 50);
  doc.text(`Key ID: ${apiKey.id}`, 15, 56);
  doc.text(`Scope: ${orgName}`, 15, 62);
  if (apiKey.webhookUrl) {
    doc.text(`Webhook URL: ${apiKey.webhookUrl}`, 15, 68);
  }

  // The actual key (only shown on creation)
  let yPos = 80;
  if (actualKey) {
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos - 5, pageWidth - 30, 20, "F");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("YOUR SECRET API KEY (KEEP THIS SAFE):", 20, yPos + 2);
    doc.setFont("courier", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(actualKey, 20, yPos + 10);
    yPos += 30;
  } else {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`KEY ENDING IN: ...${apiKey.last4}`, 15, yPos);
    yPos += 15;
  }

  // Authentication section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Authentication", 15, yPos);
  
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const authText = "To authenticate your API requests, you must include your secret API key in the request headers using the 'x-api-key' header. If you are using webhooks, events will be sent to your configured webhook URL automatically.";
  const authLines = doc.splitTextToSize(authText, pageWidth - 30);
  doc.text(authLines, 15, yPos);
  yPos += authLines.length * 5 + 10;

  // Example CURL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Usage Examples", 15, yPos);
  yPos += 10;

  // Example 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("1. Fetch all Panels for this Organization", 15, yPos);
  yPos += 6;
  
  doc.setFillColor(40, 44, 52); // Dark background for code
  doc.rect(15, yPos - 4, pageWidth - 30, 22, "F");
  doc.setTextColor(200, 200, 200);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(`curl -X GET "https://asia-south2-fyrlinc-project.cloudfunctions.net/api/panels" \\`, 20, yPos + 2);
  doc.text(`     -H "x-api-key: ${actualKey || 'YOUR_SECRET_API_KEY'}" \\`, 20, yPos + 8);
  doc.text(`     -H "Content-Type: application/json"`, 20, yPos + 14);
  
  yPos += 35;

  // Example 2
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("2. Webhook Payload Format", 15, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  const webhookText = "If you have configured a webhook, whenever an event happens (e.g., panel offline), we will POST a JSON payload to your endpoint. Example:";
  const webhookLines = doc.splitTextToSize(webhookText, pageWidth - 30);
  doc.text(webhookLines, 15, yPos);
  yPos += webhookLines.length * 5 + 2;

  doc.setFillColor(40, 44, 52);
  doc.rect(15, yPos - 4, pageWidth - 30, 30, "F");
  doc.setTextColor(200, 200, 200);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(`{`, 20, yPos + 2);
  doc.text(`  "event": "PANEL_OFFLINE",`, 20, yPos + 8);
  doc.text(`  "panelSerial": "P001",`, 20, yPos + 14);
  doc.text(`  "timestamp": "2026-07-09T14:30:00Z"`, 20, yPos + 20);
  doc.text(`}`, 20, yPos + 26);

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 15, doc.internal.pageSize.height - 15);

  // Save the PDF
  const filename = `Fyrlinc_API_${apiKey.label.replace(/\s+/g, '_')}_${apiKey.last4}.pdf`;
  doc.save(filename);
};
