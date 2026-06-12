import apiClient from './axios';
import { Panel, Event, CommandResponse } from '../types';

export const PanelService = {
  async getPanels(): Promise<Panel[]> {
    const response = await apiClient.get('/panels');
    return response.data.panels;
  },

  async getEvents(serial: string, limit: number = 50): Promise<Event[]> {
    const response = await apiClient.get(`/panels/${serial}/events`, {
      params: { limit }
    });
    return response.data.events;
  },

  async sendCommand(serial: string, command: string): Promise<CommandResponse> {
    const response = await apiClient.post(`/panels/${serial}/commands`, { command });
    return response.data;
  },

  async createPanel(data: {
    serial: string;
    name: string;
    zoneCount: number;
    companyId: string;
    branchId: string;
    ipAddress?: string;
    allowedCommands?: string[];
  }): Promise<Panel> {
    const response = await apiClient.post('/panels', data);
    return response.data;
  },

  async updatePanel(serial: string, data: Partial<Panel>): Promise<Panel> {
    const response = await apiClient.patch(`/panels/${serial}`, data);
    return response.data;
  },

  async deletePanel(serial: string): Promise<void> {
    await apiClient.delete(`/panels/${serial}`);
  },

  async resolveZoneAlarm(serial: string, zoneIndex: number): Promise<void> {
    await apiClient.patch(`/panels/${serial}/zones/${zoneIndex}/resolve`);
  }
};
