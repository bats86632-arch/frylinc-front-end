import apiClient from "./axios";
import { User, Role } from "../types";

let cachedUsers: User[] | null = null;
let lastFetchTime = 0;

export const UserService = {
  invalidateCache() {
    cachedUsers = null;
    lastFetchTime = 0;
  },

  async getUsers(): Promise<User[]> {
    if (cachedUsers && Date.now() - lastFetchTime < 60000) {
      return cachedUsers;
    }
    const response = await apiClient.get("/users");
    cachedUsers = response.data.users || [];
    lastFetchTime = Date.now();
    return cachedUsers as User[];
  },

  async updateUserRole(uid: string, role: Role): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}/role`, { role });
    this.invalidateCache();
    return response.data;
  },

  async createUser(data: {
    email: string;
    password: string;
    displayName: string;
    role: Role;
    companyId?: string;
    branchIds?: string[];
    assignments?: Record<string, string[]>;
  }): Promise<User> {
    const response = await apiClient.post("/users", data);
    this.invalidateCache();
    return response.data.user;
  },

  async updateUser(
    uid: string,
    data: Partial<User> & { password?: string },
  ): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}`, data);
    this.invalidateCache();
    return response.data;
  },

  async deleteUser(uid: string): Promise<void> {
    await apiClient.delete(`/users/${uid}`);
    this.invalidateCache();
  },

  async updateUserGroups(uid: string, groups: string[]): Promise<User> {
    const response = await apiClient.patch(`/users/${uid}/groups`, { groups });
    this.invalidateCache();
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
    this.invalidateCache();
    return response.data;
  },
};
