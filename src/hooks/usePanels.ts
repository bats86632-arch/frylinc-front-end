import { usePanelsContext } from '../contexts/PanelsContext';

export function usePanels() {
  return usePanelsContext();
}

export function usePanel(serial: string) {
  const { panels, loading, error } = usePanelsContext();
  const panel = panels.find(p => p.serial === serial) || null;
  return { panel, loading, error };
}
