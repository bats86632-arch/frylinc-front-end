import apiClient from './axios';
import { Panel, Event, CommandResponse } from '../types';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

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
    console.log(`[BRIDGE] Sending command "${command}" to panel ${serial}`);
    const response = await apiClient.post(`/panels/${serial}/commands`, { command });
    return response.data;
  },

  waitForCommandConfirmation(serial: string, commandId: string, timeoutMs: number = 15000): Promise<void> {
    return new Promise((resolve, reject) => {
      const commandRef = doc(db, 'panels', serial, 'commands', commandId);
      let timeoutId: NodeJS.Timeout;
      
      const unsubscribe = onSnapshot(
        commandRef,
        (docSnap) => {
          if (!docSnap.exists()) return;
          const data = docSnap.data();
          if (data.status === 'sent' || data.status === 'acknowledged') {
            clearTimeout(timeoutId);
            unsubscribe();
            resolve();
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          unsubscribe();
          reject(error);
        }
      );

      timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error('VM Bridge did not acknowledge command in time'));
      }, timeoutMs);
    });
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

  async markNotificationSeen(serial: string): Promise<void> {
    await apiClient.post(`/panels/${serial}/notifications/seen`);
  },

  async clearNotification(serial: string): Promise<void> {
    await apiClient.post(`/panels/${serial}/notifications/clear`);
  },

  async deletePanel(serial: string): Promise<void> {
    await apiClient.delete(`/panels/${serial}`);
  },

  async resolveZoneAlarm(serial: string, zoneIndex: number): Promise<void> {
    await apiClient.patch(`/panels/${serial}/zones/${zoneIndex}/resolve`);
  }
};
