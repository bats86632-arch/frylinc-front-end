import apiClient from './axios';
import { Group } from '../types';

export const GroupService = {
  async getGroups(): Promise<Group[]> {
    const response = await apiClient.get('/groups');
    return response.data.groups;
  },

  async createGroup(data: {
    name: string;
    description?: string;
    groupId?: string;
    allowedCommands?: string[];
  }): Promise<{ ok: boolean; groupId: string }> {
    const response = await apiClient.post('/groups', data);
    return response.data;
  },

  async updateGroup(
    groupId: string,
    data: Partial<{ name: string; description: string; enabled: boolean; allowedCommands: string[] }>
  ): Promise<{ ok: boolean; groupId: string }> {
    const response = await apiClient.patch(`/groups/${groupId}`, data);
    return response.data;
  },

  async deleteGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
  }
};
