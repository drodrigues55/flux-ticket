import { z } from 'zod';

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'FINANCE' | 'EVENT_MANAGER' | 'STAFF_MANAGER' | 'ANALYST';

export type OrganizationMemberStatus = 'ACTIVE' | 'INVITED' | 'REMOVED';

export interface OrganizationProfile {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export const UpdateOrganizationProfileInputSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  legalName: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional(),
  phone: z.string().nullable().optional(),
  timezone: z.string().default('UTC'),
});

export type UpdateOrganizationProfileInput = z.infer<typeof UpdateOrganizationProfileInputSchema>;

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  joinedAt: string;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export const InviteOrganizationMemberInputSchema = z.object({
  email: z.string().email('Email de convite inválido'),
  role: z.enum(['OWNER', 'ADMIN', 'FINANCE', 'EVENT_MANAGER', 'STAFF_MANAGER', 'ANALYST'] as const, {
    errorMap: () => ({ message: 'Cargo inválido' })
  }),
});

export type InviteOrganizationMemberInput = z.infer<typeof InviteOrganizationMemberInputSchema>;

export const AcceptOrganizationInviteInputSchema = z.object({
  token: z.string().min(1, 'Token inválido'),
});

export type AcceptOrganizationInviteInput = z.infer<typeof AcceptOrganizationInviteInputSchema>;

export const UpdateOrganizationMemberRoleInputSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'FINANCE', 'EVENT_MANAGER', 'STAFF_MANAGER', 'ANALYST'] as const, {
    errorMap: () => ({ message: 'Cargo inválido' })
  }),
});

export type UpdateOrganizationMemberRoleInput = z.infer<typeof UpdateOrganizationMemberRoleInputSchema>;

export interface OrganizationPermissionsReadModel {
  role: OrganizationRole;
  permissions: string[];
}
