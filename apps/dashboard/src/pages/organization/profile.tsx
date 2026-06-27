import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { readEnvelope, type ApiError } from '../../lib/finance';
import type { OrganizationProfile } from '@flux/types';
import { Save, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function OrgProfilePage() {
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await readEnvelope<OrganizationProfile>(
          await fetch('/api/organization/profile')
        );
        setProfile(data);
        setName(data.name);
        setLegalName(data.legalName || '');
        setCnpj(data.cnpj || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setTimezone(data.timezone || 'UTC');
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg('');

      const res = await fetch('/api/organization/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          legalName: legalName || null,
          cnpj: cnpj || null,
          email: email || null,
          phone: phone || null,
          timezone,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const err = json.error || {};
        throw {
          message: err.message || json.message || 'Falha ao salvar dados.',
          requestId: err.requestId || json.requestId,
        } satisfies ApiError;
      }

      setSuccessMsg('Perfil da organização atualizado com sucesso.');
      setProfile(json.data || json);
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Sub-navigation */}
        <div className="flex items-center gap-6 border-b pb-4 mb-4">
          <Link href="/organization/profile" className="text-base font-bold text-[#FF3200] border-b-2 border-[#FF3200] pb-2 no-underline">
            Perfil da Organização
          </Link>
          <Link href="/organization/members" className="text-base font-medium text-[var(--text-muted)] hover:text-[#FF3200] pb-2 no-underline">
            Membros e Equipe
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Ocorreu um erro</p>
              <p className="text-sm">{error.message}</p>
              {error.requestId && (
                <p className="text-xs text-red-500 mt-1 font-mono">ID da Requisição: {error.requestId}</p>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm text-[var(--text-muted)]">
            Carregando dados da organização...
          </div>
        ) : (
          <form onSubmit={handleSave} className="flux-surface p-6 rounded-2xl border space-y-5">
            <h2 className="text-lg font-bold text-[var(--text)]">Informações Básicas</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Nome Comercial / Fantasia</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full flux-input h-10 px-3 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Razão Social</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full flux-input h-10 px-3 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">CNPJ / Documento</label>
                <input
                  type="text"
                  value={cnpj}
                  placeholder="00.000.000/0000-00"
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full flux-input h-10 px-3 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">E-mail de Contato</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full flux-input h-10 px-3 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full flux-input h-10 px-3 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Fuso Horário</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full flux-input h-10 px-3 rounded-lg text-sm bg-[var(--surface)]"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="flux-btn h-10 px-5 rounded-full flex items-center gap-2 bg-[#FF3200] text-white hover:bg-[#E02B00]"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
