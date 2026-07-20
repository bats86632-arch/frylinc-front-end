export function formatDate(date: unknown): string {
  if (!date) return 'Unknown Date';
  let d: Date;
  if (typeof date === 'object' && date !== null && '_seconds' in date) {
    d = new Date((date as { _seconds: number })._seconds * 1000);
  } else {
    d = new Date(date as string | number | Date);
  }
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(date: unknown): string {
  if (!date) return 'Unknown Time';
  let d: Date;
  if (typeof date === 'object' && date !== null && '_seconds' in date) {
    d = new Date((date as { _seconds: number })._seconds * 1000);
  } else {
    d = new Date(date as string | number | Date);
  }
  if (isNaN(d.getTime())) return 'Invalid Time';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDateTime(date: unknown): string {
  if (!date) return 'Unknown';
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function parseHardwareHex(hexString: string): boolean[] {
  const zoneStates: boolean[] = [];
  for (let i = 0; i < hexString.length; i++) {
    const byte = parseInt(hexString[i], 16);
    for (let bit = 3; bit >= 0; bit--) {
      zoneStates.push((byte & (1 << bit)) !== 0);
    }
  }
  return zoneStates;
}

export function getAlarmBadgeColor(alarm: boolean): string {
  return alarm ? 'bg-red-500' : 'bg-green-500';
}

export function getStatusColor(connected: boolean): string {
  return connected ? 'bg-green-500' : 'bg-red-500';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

export function formatPanelName(name: string, type?: string): string {
  const baseName = name || "Unknown Panel";
  let suffix = "";
  if (type === "fire") suffix = " (FAP)";
  else if (type === "security") suffix = " (SAP)";
  else if (type === "gsm") suffix = " (GSM)";
  return `${baseName}${suffix}`;
}
