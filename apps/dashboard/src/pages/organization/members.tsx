import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { readEnvelope, type ApiError } from '../../lib/finance';
import type { OrganizationMember, OrganizationInvite } from '@flux/types';
import { ShieldAlert, Trash2, UserPlus, RefreshCw, XCircle } from 'lucide-react';

export default function OrgMembersPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EVENT_MANAGER');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviting, setInviting] = useState(false);

  // High-risk action state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDisableId, setConfirmDisableId] = useState<string | null>(null);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [escalateRole, setEscalateRole] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const membersData = await readEnvelope<OrganizationMember[]>(
        await fetch('/api/organization/members')
      );
      setMembers(membersData);

      const invitesData = await readEnvelope<OrganizationInvite[]>(
        await fetch('/api/organization/invites')
      );
      setInvites(invitesData);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInviting(true);
      setInviteMsg('');
      const res = await fetch('/api/organization/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        const err = json.error || {};
        throw {
          message: err.message || json.message || 'Falha ao convidar membro.',
          requestId: err.requestId || json.requestId,
        } satisfies ApiError;
      }
      setInviteMsg('Convite criado. Envio por e-mail em processamento.');
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      setError(err);
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/organization/invites/${inviteId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json.error || {};
        throw { message: err.message || json.message || 'Falha ao cancelar.' } satisfies ApiError;
      }
      loadData();
    } catch (err: any) {
      setError(err);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/organization/invites/${inviteId}/resend`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json.error || {};
        throw { message: err.message || json.message || 'Falha ao reenviar.' } satisfies ApiError;
      }
      setInviteMsg('Reenvio do convite enfileirado.');
    } catch (err: any) {
      setError(err);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      const res = await fetch(`/api/organization/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json.error || {};
        throw { message: err.message || json.message || 'Falha ao alterar cargo.' } satisfies ApiError;
      }
      setEscalatingId(null);
      loadData();
    } catch (err: any) {
      setError(err);
    }
  };

  const handleDisableMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/organization/members/${memberId}/disable`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json.error || {};
        throw { message: err.message || json.message || 'Falha ao desativar.' } satisfies ApiError;
      }
      setConfirmDisableId(null);
      loadData();
    } catch (err: any) {
      setError(err);
    }
  };

  const handleEnableMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/organization/members/${memberId}/enable`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json.error || {};
        throw { message: err.message || json.message || 'Falha ao ativar.' } satisfies ApiError;
      }
      loadData();
    } catch (err: any) {
      setError(err);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json.error || {};
        throw { message: err.message || json.message || 'Falha ao excluir.' } satisfies ApiError;
      }
      setConfirmDeleteId(null);
      loadData();
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Sub-navigation */}
        <div className="flex items-center gap-6 border-b pb-4 mb-4">
          <Link href="/organization/profile" className="text-base font-medium text-[var(--text-muted)] hover:text-[#FF3200] pb-2 no-underline">
            Perfil da Organização
          </Link>
          <Link href="/organization/members" className="text-base font-bold text-[#FF3200] border-b-2 border-[#FF3200] pb-2 no-underline">
            Membros e Equipe
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Erro de Operação</p>
              <p className="text-sm">{error.message}</p>
              {error.requestId && (
                <p className="text-xs text-red-500 mt-1 font-mono">ID: {error.requestId}</p>
              )}
            </div>
          </div>
        )}

        {inviteMsg && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
            {inviteMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          
          {/* Members & Invites Section */}
          <div className="space-y-6">
            
            {/* Members Card */}
            <div className="flux-surface border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-base font-bold text-[var(--text)]">Membros Ativos</h3>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando membros...</div>
              ) : (
                <div className="divide-y">
                  {members.map((member) => (
                    <div key={member.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[var(--text)]">{member.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                        }`}>
                          {member.status === 'ACTIVE' ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={member.role}
                          onChange={(e) => {
                            setEscalateRole(e.target.value);
                            setEscalatingId(member.id);
                          }}
                          className="flux-input text-xs h-8 px-2 rounded-lg bg-[var(--surface)]"
                        >
                          <option value="OWNER">Proprietário (OWNER)</option>
                          <option value="ADMIN">Administrador (ADMIN)</option>
                          <option value="FINANCE">Financeiro (FINANCE)</option>
                          <option value="EVENT_MANAGER">Gestor de Eventos</option>
                          <option value="STAFF_MANAGER">Portaria / Staff</option>
                          <option value="ANALYST">Analista (Leitura)</option>
                        </select>

                        {member.status === 'ACTIVE' ? (
                          <button
                            onClick={() => setConfirmDisableId(member.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 border-none bg-transparent cursor-pointer"
                            title="Desativar Membro"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnableMember(member.id)}
                            className="p-1.5 text-neutral-400 hover:text-emerald-500 border-none bg-transparent cursor-pointer"
                            title="Ativar Membro"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setConfirmDeleteId(member.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 border-none bg-transparent cursor-pointer"
                          title="Excluir Membro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invites Card */}
            {invites.length > 0 && (
              <div className="flux-surface border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-base font-bold text-[var(--text)]">Convites Pendentes</h3>
                </div>

                <div className="divide-y">
                  {invites.map((invite) => (
                    <div key={invite.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-[var(--text)]">{invite.email}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Cargo: {invite.role}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResendInvite(invite.id)}
                          className="text-xs font-semibold px-2.5 py-1.5 border rounded-lg hover:bg-neutral-50 bg-white cursor-pointer"
                        >
                          Reenviar
                        </button>
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          className="text-xs font-semibold px-2.5 py-1.5 border rounded-lg hover:bg-neutral-50 text-red-500 bg-white cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Invite Member Sidebar Form */}
          <div className="space-y-6">
            <form onSubmit={handleInvite} className="flux-surface p-5 border rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#FF3200]" />
                Convidar Membro
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">E-mail do Convidado</label>
                <input
                  type="email"
                  required
                  placeholder="email@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full flux-input h-9 px-3 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Cargo</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full flux-input h-9 px-3 rounded-lg text-sm bg-[var(--surface)]"
                >
                  <option value="ADMIN">Administrador (ADMIN)</option>
                  <option value="FINANCE">Financeiro (FINANCE)</option>
                  <option value="EVENT_MANAGER">Gestor de Eventos</option>
                  <option value="STAFF_MANAGER">Portaria / Staff</option>
                  <option value="ANALYST">Analista (Leitura)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={inviting}
                className="w-full flux-btn h-9 rounded-full bg-[#FF3200] text-white hover:bg-[#E02B00] text-sm"
              >
                {inviting ? 'Convidando...' : 'Enviar Convite'}
              </button>
            </form>
          </div>
        </div>

        {/* Confirmation Dialogs */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
              <h4 className="text-base font-bold text-neutral-900">Excluir Membro?</h4>
              <p className="text-sm text-neutral-500">Esta ação removerá definitivamente o acesso deste membro à organização.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteId(null)} className="text-sm font-semibold px-4 py-2 border rounded-full bg-white cursor-pointer">Cancelar</button>
                <button onClick={() => handleDeleteMember(confirmDeleteId)} className="text-sm font-semibold px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 border-none cursor-pointer">Confirmar Exclusão</button>
              </div>
            </div>
          </div>
        )}

        {confirmDisableId && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
              <h4 className="text-base font-bold text-neutral-900">Desativar Membro?</h4>
              <p className="text-sm text-neutral-500">Este membro perderá acesso imediatamente a todas as informações e recursos.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDisableId(null)} className="text-sm font-semibold px-4 py-2 border rounded-full bg-white cursor-pointer">Cancelar</button>
                <button onClick={() => handleDisableMember(confirmDisableId)} className="text-sm font-semibold px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 border-none cursor-pointer">Confirmar Desativação</button>
              </div>
            </div>
          </div>
        )}

        {escalatingId && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
              <h4 className="text-base font-bold text-neutral-900">Alterar Cargo?</h4>
              <p className="text-sm text-neutral-500">Você está alterando o cargo deste membro. Certifique-se de validar as permissões de acesso correspondentes.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setEscalatingId(null)} className="text-sm font-semibold px-4 py-2 border rounded-full bg-white cursor-pointer">Cancelar</button>
                <button onClick={() => handleRoleChange(escalatingId, escalateRole)} className="text-sm font-semibold px-4 py-2 rounded-full bg-[#FF3200] text-white hover:bg-[#E02B00] border-none cursor-pointer">Confirmar Alteração</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
