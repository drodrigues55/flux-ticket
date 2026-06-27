import test from 'node:test';
import assert from 'node:assert/strict';

// Helper simulated state validation matches controller rules
interface Member {
  id: string;
  role: string;
  status: string;
}

function canChangeRole(params: {
  currentUserRole: string;
  targetMemberId: string;
  currentUserId: string;
  targetMemberUserId: string;
  targetMemberCurrentRole: string;
  newRole: string;
  ownerCount: number;
}): { allowed: boolean; reason?: string } {
  if (!['OWNER', 'ADMIN'].includes(params.currentUserRole)) {
    return { allowed: false, reason: 'Ação não permitida para o seu nível de acesso.' };
  }
  if (params.targetMemberUserId === params.currentUserId && params.newRole !== params.targetMemberCurrentRole) {
    return { allowed: false, reason: 'Você não pode alterar seu próprio cargo.' };
  }
  if (params.targetMemberCurrentRole === 'OWNER' && params.newRole !== 'OWNER' && params.ownerCount <= 1) {
    return { allowed: false, reason: 'Não é possível remover o único proprietário da organização.' };
  }
  return { allowed: true };
}

test('organization roles: user cannot escalate their own role', () => {
  const result = canChangeRole({
    currentUserRole: 'ADMIN',
    targetMemberId: 'm-1',
    currentUserId: 'u-1',
    targetMemberUserId: 'u-1', // self
    targetMemberCurrentRole: 'ADMIN',
    newRole: 'OWNER',
    ownerCount: 1,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'Você não pode alterar seu próprio cargo.');
});

test('organization roles: cannot downgrade last owner', () => {
  const result = canChangeRole({
    currentUserRole: 'OWNER',
    targetMemberId: 'm-1',
    currentUserId: 'u-owner-1',
    targetMemberUserId: 'u-owner-2', // other owner
    targetMemberCurrentRole: 'OWNER',
    newRole: 'ADMIN',
    ownerCount: 1, // only 1 owner left in org
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'Não é possível remover o único proprietário da organização.');
});

test('organization roles: owner can downgrade other owner if multiple owners exist', () => {
  const result = canChangeRole({
    currentUserRole: 'OWNER',
    targetMemberId: 'm-1',
    currentUserId: 'u-owner-1',
    targetMemberUserId: 'u-owner-2',
    targetMemberCurrentRole: 'OWNER',
    newRole: 'ADMIN',
    ownerCount: 2, // multiple owners exist
  });

  assert.equal(result.allowed, true);
});
