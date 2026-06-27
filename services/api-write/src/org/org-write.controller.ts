import { Controller, Patch, Post, Delete, Body, Param, Req, UseGuards, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { StaffGuard } from '../tickets/staff-guard';
import { InviteOrganizationMemberInputSchema, UpdateOrganizationProfileInputSchema } from '@flux/types';
import { randomUUID } from 'crypto';

@Controller('organization')
@UseGuards(StaffGuard)
export class OrgWriteController {

  private async getMembership(userId: string) {
    let membership = await prisma.organizationMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { organization: true },
    });

    if (!membership) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const userName = user?.name || 'Organizer';
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

  private async enforceRole(userId: string, allowedRoles: string[]) {
    const membership = await this.getMembership(userId);
    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Ação não permitida para o seu nível de acesso.');
    }
    return membership;
  }

  @Patch('profile')
  async updateProfile(@Body() body: any, @Req() req: any) {
    const membership = await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const parsed = UpdateOrganizationProfileInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details: parsed.error.flatten(),
      });
    }

    const updated = await prisma.organization.update({
      where: { id: membership.organizationId },
      data: parsed.data,
    });
    return updated;
  }

  @Post('invites')
  async createInvite(@Body() body: any, @Req() req: any) {
    const membership = await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const parsed = InviteOrganizationMemberInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details: parsed.error.flatten(),
      });
    }

    const { email, role } = parsed.data;

    // Check if user is already an active member of this organization
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: membership.organizationId,
        user: { email },
        status: 'ACTIVE',
      },
    });
    if (existingMember) {
      throw new BadRequestException('Este usuário já é um membro ativo da organização.');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId: membership.organizationId,
        email,
        role,
        token,
        expiresAt,
      },
    });

    return invite;
  }

  @Post('invites/:inviteId/resend')
  async resendInvite(@Param('inviteId') inviteId: string, @Req() req: any) {
    await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado.');

    const updated = await prisma.organizationInvite.update({
      where: { id: inviteId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return updated;
  }

  @Post('invites/:inviteId/cancel')
  async cancelInvite(@Param('inviteId') inviteId: string, @Req() req: any) {
    await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado.');

    await prisma.organizationInvite.delete({
      where: { id: inviteId },
    });
    return { success: true };
  }

  @Post('invites/accept')
  async acceptInvite(@Body() body: { token: string }, @Req() req: any) {
    const { token } = body;
    if (!token) throw new BadRequestException('Token é obrigatório.');

    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new NotFoundException('Convite inválido ou expirado.');
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Convite expirado.');
    }

    // Add user as member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: req.user.userId,
        },
      },
    });

    if (existingMembership) {
      await prisma.organizationMember.update({
        where: { id: existingMembership.id },
        data: { status: 'ACTIVE', role: invite.role },
      });
    } else {
      await prisma.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId: req.user.userId,
          role: invite.role,
          status: 'ACTIVE',
        },
      });
    }

    await prisma.organizationInvite.delete({
      where: { id: invite.id },
    });

    return { success: true };
  }

  @Patch('members/:memberId/role')
  async changeRole(@Param('memberId') memberId: string, @Body() body: { role: string }, @Req() req: any) {
    const currentMembership = await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!targetMember) throw new NotFoundException('Membro não encontrado.');

    // Users cannot escalate their own role
    if (targetMember.userId === req.user.userId && body.role !== targetMember.role) {
      throw new ForbiddenException('Você não pode alterar seu próprio cargo.');
    }

    // Last owner protection
    if (targetMember.role === 'OWNER' && body.role !== 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: currentMembership.organizationId, role: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Não é possível remover o único proprietário da organização.');
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: body.role },
    });
    return updated;
  }

  @Post('members/:memberId/disable')
  async disableMember(@Param('memberId') memberId: string, @Req() req: any) {
    const currentMembership = await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!targetMember) throw new NotFoundException('Membro não encontrado.');

    // Cannot disable self if they are the only owner
    if (targetMember.userId === req.user.userId) {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: currentMembership.organizationId, role: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Não é possível desativar o único proprietário da organização.');
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { status: 'REMOVED' },
    });
    return updated;
  }

  @Post('members/:memberId/enable')
  async enableMember(@Param('memberId') memberId: string, @Req() req: any) {
    await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!targetMember) throw new NotFoundException('Membro não encontrado.');

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { status: 'ACTIVE' },
    });
    return updated;
  }

  @Delete('members/:memberId')
  async deleteMember(@Param('memberId') memberId: string, @Req() req: any) {
    const currentMembership = await this.enforceRole(req.user.userId, ['OWNER', 'ADMIN']);
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!targetMember) throw new NotFoundException('Membro não encontrado.');

    if (targetMember.role === 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: currentMembership.organizationId, role: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Não é possível excluir o único proprietário da organização.');
      }
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });
    return { success: true };
  }
}
