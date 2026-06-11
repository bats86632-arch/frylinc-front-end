export const DEFAULT_PANEL_COMMANDS = ['ARM', 'ZONE OFF', 'MOB=01='];

export function normalizeAllowedCommands(commands: string[] | undefined | null): string[] {
  if (!Array.isArray(commands) || commands.length === 0) {
    return [...DEFAULT_PANEL_COMMANDS];
  }

  return commands.filter((command) => typeof command === 'string' && command.trim().length > 0);
}