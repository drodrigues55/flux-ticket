import { Router } from 'express';
import { ok, fail } from '../api-response';
import { authMiddleware, AuthenticatedRequest } from '../auth-middleware';
import { RequestWithId } from '../request-id-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const orgRouter = Router();

function requestId(req: RequestWithId) {
  return req.requestId || 'req_unknown';
}

function sendError(res: any, req: RequestWithId, statusCode: number, code: string, message: string, details?: any) {
  res.status(statusCode).json(fail({
    code,
    message,
    statusCode,
    requestId: requestId(req),
    details,
  }));
}

// Helper to get or create organization for authenticated organizer
async function getOrCreateUserOrg(userId: string) {
  let membership = await prisma.organizationMember.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { organization: true },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'Organizer';

    // Auto-create organization for this user to ensure backwards compatibility
    const org = await prisma.organization.create({
      data: {
        name: `${userName}'s Org`,
        timezone: 'UTC',
      },
    });

    membership = await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
      include: { organization: true },
    });
  }

  return membership;
}

orgRouter.use(authMiddleware);

// GET /organization/profile
orgRouter.get('/profile', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, req, 401, 'UNAUTHORIZED', 'Não autenticado');

    const membership = await getOrCreateUserOrg(userId);
    const org = membership.organization;

    res.json(ok({
      id: org.id,
      name: org.name,
      legalName: org.legalName,
      cnpj: org.cnpj,
      email: org.email,
      phone: org.phone,
      timezone: org.timezone,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    }, requestId(req)));
  } catch (err: any) {
    sendError(res, req, 500, 'SERVER_ERROR', err.message);
  }
});

// GET /organization/members
orgRouter.get('/members', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, req, 401, 'UNAUTHORIZED', 'Não autenticado');

    const membership = await getOrCreateUserOrg(userId);
    const orgId = membership.organizationId;

    const dbMembers = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: true },
    });

    const members = dbMembers.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt.toISOString(),
    }));

    res.json(ok(members, requestId(req)));
  } catch (err: any) {
    sendError(res, req, 500, 'SERVER_ERROR', err.message);
  }
});

// GET /organization/invites
orgRouter.get('/invites', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, req, 401, 'UNAUTHORIZED', 'Não autenticado');

    const membership = await getOrCreateUserOrg(userId);
    const orgId = membership.organizationId;

    const dbInvites = await prisma.organizationInvite.findMany({
      where: { organizationId: orgId },
    });

    const invites = dbInvites.map((invite) => ({
      id: invite.id,
      organizationId: invite.organizationId,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    }));

    res.json(ok(invites, requestId(req)));
  } catch (err: any) {
    sendError(res, req, 500, 'SERVER_ERROR', err.message);
  }
});

// GET /organization/permissions/me
orgRouter.get('/permissions/me', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, req, 401, 'UNAUTHORIZED', 'Não autenticado');

    const membership = await getOrCreateUserOrg(userId);
    const role = membership.role;

    let permissions: string[] = [];
    if (role === 'OWNER') {
      permissions = ['profile:view', 'profile:edit', 'members:view', 'members:invite', 'members:edit', 'events:manage', 'finance:view', 'publishing:manage'];
    } else if (role === 'ADMIN') {
      permissions = ['profile:view', 'members:view', 'members:invite', 'events:manage', 'publishing:manage', 'staff:manage', 'dashboard:view'];
    } else if (role === 'FINANCE') {
      permissions = ['profile:view', 'finance:view', 'ledger:view'];
    } else if (role === 'EVENT_MANAGER') {
      permissions = ['profile:view', 'events:manage', 'batches:manage'];
    } else if (role === 'STAFF_MANAGER') {
      permissions = ['profile:view', 'staff:manage', 'checkins:view'];
    } else if (role === 'ANALYST') {
      permissions = ['profile:view', 'dashboard:view', 'events:view'];
    }

    res.json(ok({ role, permissions }, requestId(req)));
  } catch (err: any) {
    sendError(res, req, 500, 'SERVER_ERROR', err.message);
  }
});

// GET /organization/roles
orgRouter.get('/roles', async (req: AuthenticatedRequest & RequestWithId, res) => {
  res.json(ok([
    { role: 'OWNER', description: 'Acesso total e gerenciamento de membros/cargos' },
    { role: 'ADMIN', description: 'Gerenciamento de eventos, publicação e portarias' },
    { role: 'FINANCE', description: 'Acesso ao centro financeiro e relatórios de vendas' },
    { role: 'EVENT_MANAGER', description: 'Criação e edição de eventos, ingressos e lotes' },
    { role: 'STAFF_MANAGER', description: 'Gerenciamento de credenciais e operação de portaria' },
    { role: 'ANALYST', description: 'Acesso de leitura ao painel e estatísticas de vendas' },
  ], requestId(req)));
});
