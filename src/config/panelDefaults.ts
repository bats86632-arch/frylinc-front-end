// Fixed commands for all panels - no customization needed
export const DEFAULT_PANEL_COMMANDS = ['ARM', 'ZONE OFF'];

// Default MQTT broker settings (from Python script)
export const DEFAULT_MQTT_CONFIG = {
  BROKER_HOST: '72.167.225.142',
  BROKER_PORT: 1883,
  USERNAME: 'fyrlincusr',
  PASSWORD: 'Zyi![#=0R_H@dVM',
  TX_MODE: 'plain', // 'plain' or 'framed'
};

// Zone status codes
export const ZONE_STATUS = {
  NORMAL: '1',
  FIRE: '2',
  SHORT: '3',
  OPEN: '4',
  ISOLATE: '5',
} as const;

export function normalizeAllowedCommands(commands: string[] | undefined | null): string[] {
  // Always return the fixed default commands
  return [...DEFAULT_PANEL_COMMANDS];
}