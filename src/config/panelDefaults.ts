// Fixed commands for all panels - no customization needed
export const DEFAULT_PANEL_COMMANDS = ['ARM', 'ZONE OFF'];


// Zone status codes
export const ZONE_STATUS = {
  NORMAL: '1',
  FIRE: '2',
  SHORT: '3',
  OPEN: '4',
  ISOLATE: '5',
} as const;

export function normalizeAllowedCommands(): string[] {
  // Always return the fixed default commands
  return [...DEFAULT_PANEL_COMMANDS];
}
