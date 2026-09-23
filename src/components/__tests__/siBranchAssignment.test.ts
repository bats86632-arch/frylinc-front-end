import { describe, it, expect } from 'vitest';
import { Branch, Role, User } from '../../types';

// Extract the RBAC logic to test it directly
function getAvailableBranches(
  actorRole: Role,
  actorData: User | null,
  allBranches: Branch[],
  companyId: string,
): Branch[] {
  if (!companyId) return [];

  const companyBranches = allBranches.filter(
    (b) => b.companyId === companyId || (b as any).company_id === companyId,
  );

  if (
    actorRole === "super_admin" ||
    actorRole === "system_service_account" ||
    actorRole === "head_office"
  ) {
    return companyBranches;
  }

  if (actorRole === "system_integrator" && actorData?.assignments) {
    const allowed = actorData.assignments[companyId] || [];
    if (allowed.includes("*")) return companyBranches;
    return companyBranches.filter((b) => allowed.includes(b.id));
  }

  return companyBranches;
}

function resolveSiSubmissionData(
  siAssignments: Record<string, string[]>,
  selectedCompanyId?: string,
  editingUser?: User | null,
) {
  const compKeys = Object.keys(siAssignments);
  const primaryComp =
    (selectedCompanyId && siAssignments[selectedCompanyId] ? selectedCompanyId : null) ||
    (editingUser?.companyId && siAssignments[editingUser.companyId] ? editingUser.companyId : null) ||
    compKeys[0] ||
    undefined;

  return {
    finalCompanyId: primaryComp,
    finalBranchIds: primaryComp ? (siAssignments[primaryComp] || []) : [],
    finalAssignments: siAssignments,
  };
}

describe('SI Branch Availability and Assignment Matrix', () => {
  const branches: Branch[] = [
    { id: 'b1_1', branchId: 'b1_1', name: 'Branch 1A', companyId: 'comp-1' },
    { id: 'b1_2', branchId: 'b1_2', name: 'Branch 1B', companyId: 'comp-1' },
    { id: 'b2_1', branchId: 'b2_1', name: 'Branch 2A', companyId: 'comp-2' },
    { id: 'b2_2', branchId: 'b2_2', name: 'Branch 2B', companyId: 'comp-2' },
    { id: 'b3_1', branchId: 'b3_1', name: 'Branch 3A', companyId: 'comp-3' },
  ];

  it('super_admin can view all branches for newly added 2nd company', () => {
    const available = getAvailableBranches('super_admin', null, branches, 'comp-2');
    expect(available.map((b) => b.id)).toEqual(['b2_1', 'b2_2']);
  });

  it('system_service_account can view all branches for newly added 2nd company', () => {
    const available = getAvailableBranches('system_service_account', null, branches, 'comp-2');
    expect(available.map((b) => b.id)).toEqual(['b2_1', 'b2_2']);
  });

  it('head_office can view branches for their own company', () => {
    const actorData: User = {
      uid: 'ho1',
      email: 'ho@test.com',
      displayName: 'HO User',
      role: 'head_office',
      companyId: 'comp-1',
    };
    const available = getAvailableBranches('head_office', actorData, branches, 'comp-1');
    expect(available.map((b) => b.id)).toEqual(['b1_1', 'b1_2']);
  });

  it('system_integrator actor is scoped to their own allowed branches', () => {
    const actorData: User = {
      uid: 'si1',
      email: 'si@test.com',
      displayName: 'SI User',
      role: 'system_integrator',
      companyId: 'comp-1',
      assignments: {
        'comp-1': ['b1_1'],
        'comp-2': ['*'],
      },
    };
    const comp1Branches = getAvailableBranches('system_integrator', actorData, branches, 'comp-1');
    expect(comp1Branches.map((b) => b.id)).toEqual(['b1_1']);

    const comp2Branches = getAvailableBranches('system_integrator', actorData, branches, 'comp-2');
    expect(comp2Branches.map((b) => b.id)).toEqual(['b2_1', 'b2_2']);
  });

  it('correctly maps and resolves SI assignments for multi-company payload', () => {
    const siAssignments = {
      'comp-1': ['b1_1', 'b1_2'],
      'comp-2': ['b2_1'],
    };

    const result = resolveSiSubmissionData(siAssignments, 'comp-2');
    expect(result.finalCompanyId).toBe('comp-2');
    expect(result.finalBranchIds).toEqual(['b2_1']);
    expect(result.finalAssignments).toEqual(siAssignments);
  });

  it('preserves existing companyId if still in assignments when editing', () => {
    const editingUser: User = {
      uid: 'si_target',
      email: 'target@test.com',
      displayName: 'Target SI',
      role: 'system_integrator',
      companyId: 'comp-2',
      branchIds: ['b2_1'],
    };

    const siAssignments = {
      'comp-1': ['b1_1'],
      'comp-2': ['b2_1', 'b2_2'],
    };

    const result = resolveSiSubmissionData(siAssignments, undefined, editingUser);
    expect(result.finalCompanyId).toBe('comp-2');
    expect(result.finalBranchIds).toEqual(['b2_1', 'b2_2']);
    expect(result.finalAssignments).toEqual(siAssignments);
  });
});
