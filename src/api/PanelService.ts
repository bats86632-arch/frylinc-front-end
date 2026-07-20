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
    if (command === "ZONE OFF") {
      console.log(`[BRIDGE] We're sending the silence command 5 times over 5 seconds: "${command}" to panel ${serial}`);
      // Send the first command immediately and wait for its response so the UI gets a prompt reply
      const response = await apiClient.post(`/panels/${serial}/commands`, { command, repeatCount: 1 });
      
      // Fire and forget the remaining 4 commands, spaced 1 second apart
      for (let i = 1; i < 5; i++) {
        setTimeout(() => {
          console.log(`[BRIDGE] Sending silence command (retry ${i}/4): "${command}" to panel ${serial}`);
          apiClient.post(`/panels/${serial}/commands`, { command, repeatCount: 1 }).catch(e => {
            console.error(`Failed to send silence command retry ${i}`, e);
          });
        }, i * 1000);
      }
      return response.data;
    } else {
      console.log(`[BRIDGE] We're sending the commands thrice using the bridge: "${command}" to panel ${serial}`);
      const response = await apiClient.post(`/panels/${serial}/commands`, { command, repeatCount: 3 });
      return response.data;
    }
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
          } else if (data.status === 'failed') {
            clearTimeout(timeoutId);
            unsubscribe();
            reject(new Error(data.error || 'VM Bridge failed to send command'));
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
    panelType?: string;
    zoneCount: number;
    companyId: string;
    branchId: string;
    ipAddress?: string;
    allowedCommands?: string[];
    config?: any;
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
