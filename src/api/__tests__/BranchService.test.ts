import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BranchService } from '../BranchService';
import apiClient from '../axios';

vi.mock('../axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

describe('BranchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BranchService.invalidateCache();
  });

  it('fetches all branches and caches the result', async () => {
    const mockBranches = [
      { id: 'b1', name: 'Branch 1', companyId: 'comp-1' },
      { id: 'b2', name: 'Branch 2', companyId: 'comp-2' },
    ];
    (apiClient.get as any).mockResolvedValueOnce({ data: { branches: mockBranches } });

    const firstResult = await BranchService.getBranches();
    expect(apiClient.get).toHaveBeenCalledWith('/branches');
    expect(firstResult).toEqual(mockBranches);

    // Second call should return cached branches without calling API again
    const secondResult = await BranchService.getBranches();
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(secondResult).toEqual(mockBranches);
  });

  it('fetches branches for a specific companyId with query param', async () => {
    const mockComp2Branches = [
      { id: 'b2_1', name: 'Comp 2 Branch 1', companyId: 'comp-2' },
      { id: 'b2_2', name: 'Comp 2 Branch 2', companyId: 'comp-2' },
    ];
    (apiClient.get as any).mockResolvedValueOnce({ data: { branches: mockComp2Branches } });

    const result = await BranchService.getBranches('comp-2');
    expect(apiClient.get).toHaveBeenCalledWith('/branches?companyId=comp-2');
    expect(result).toEqual(mockComp2Branches);
  });

  it('getBranchesByCompany delegates to getBranches with forceRefresh', async () => {
    const mockCompBranches = [
      { id: 'b_new', name: 'New Branch', companyId: 'comp-target' },
    ];
    (apiClient.get as any).mockResolvedValueOnce({ data: { branches: mockCompBranches } });

    const result = await BranchService.getBranchesByCompany('comp-target');
    expect(apiClient.get).toHaveBeenCalledWith('/branches?companyId=comp-target');
    expect(result).toEqual(mockCompBranches);
  });

  it('merges company branches into cachedBranches when companyId is requested', async () => {
    const allBranches = [
      { id: 'b1', name: 'Branch 1', companyId: 'comp-1' },
    ];
    (apiClient.get as any).mockResolvedValueOnce({ data: { branches: allBranches } });
    await BranchService.getBranches();

    const comp2Branches = [
      { id: 'b2', name: 'Branch 2', companyId: 'comp-2' },
    ];
    (apiClient.get as any).mockResolvedValueOnce({ data: { branches: comp2Branches } });
    await BranchService.getBranches('comp-2');

    // Calling getBranches() without params should now contain merged comp-1 and comp-2 branches
    const merged = await BranchService.getBranches();
    expect(merged.map(b => b.id)).toEqual(['b1', 'b2']);
  });
});
