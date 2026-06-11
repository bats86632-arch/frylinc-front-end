import apiClient from './axios';
import { User, Role } from '../types';

export const UserService = {
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get('/users');
    return response.data.users;
  },

  async updateUserRole(uid: string, role: Role): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}/role`, { role });
    return response.data;
  },

  async updateUser(uid: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}`, data);
    return response.data;
  },

  async deleteUser(uid: string): Promise<void> {
    await apiClient.delete(`/users/${uid}`);
  }
};
