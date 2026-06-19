import apiClient from "./axios";
import { User, Role } from "../types";

export const UserService = {
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get("/users");
    return response.data.users;
  },

  async updateUserRole(uid: string, role: Role): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}/role`, { role });
    return response.data;
  },

  async createUser(data: {
    email: string;
    password: string;
    displayName: string;
    role: Role;
    companyId?: string;
    branchIds?: string[];
  }): Promise<User> {
    const response = await apiClient.post("/users", data);
    return response.data.user;
  },

  async updateUser(
    uid: string,
    data: Partial<User> & { password?: string },
  ): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}`, data);
    return response.data;
  },

  async deleteUser(uid: string): Promise<void> {
    await apiClient.delete(`/users/${uid}`);
  },

  async updateUserGroups(uid: string, groups: string[]): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}/groups`, { groups });
    return response.data;
  },

  async updateProfile(data: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    companyName?: string;
    companyRole?: string;
    employeeId?: string;
    dateOfBirth?: string;
    photoURL?: string;
  }): Promise<{ ok: boolean; uid: string }> {
    const response = await apiClient.patch("/me/profile", data);
    return response.data;
  },
};
