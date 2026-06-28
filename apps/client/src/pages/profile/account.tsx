import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Header } from '../../components/header';
import { FaCalendarDays, FaEnvelope, FaKey, FaLocationDot, FaMapLocationDot, FaPen, FaPhone, FaShieldHalved, FaSpinner, FaUser, FaIdCard } from 'react-icons/fa6';

interface ProfileDetails {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  preferredName: string;
  city: string;
  state: string;
  marketingOptIn: boolean;
}

const emptyProfile: ProfileDetails = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  birthDate: '',
  preferredName: '',
  city: '',
  state: '',
  marketingOptIn: false,
};

const navItems = [
  { label: 'Meus Ingressos', href: '/profile' },
  { label: 'Perfil', href: '/profile/account', active: true },
  { label: 'Pagamentos', href: '/profile/payments' },
];

const brazilStates = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapa' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceara' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espirito Santo' },
  { value: 'GO', label: 'Goias' },
  { value: 'MA', label: 'Maranhao' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Para' },
  { value: 'PB', label: 'Paraiba' },
  { value: 'PR', label: 'Parana' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piaui' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondonia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'Sao Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const citiesByState: Record<string, string[]> = {
  AC: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira'],
  AL: ['Maceio', 'Arapiraca', 'Palmeira dos Indios'],
  AP: ['Macapa', 'Santana', 'Laranjal do Jari'],
  AM: ['Manaus', 'Parintins', 'Itacoatiara'],
  BA: ['Salvador', 'Feira de Santana', 'Vitoria da Conquista'],
  CE: ['Fortaleza', 'Juazeiro do Norte', 'Sobral'],
  DF: ['Brasilia', 'Taguatinga', 'Ceilandia'],
  ES: ['Vitoria', 'Vila Velha', 'Serra'],
  GO: ['Goiania', 'Aparecida de Goiania', 'Anapolis'],
  MA: ['Sao Luis', 'Imperatriz', 'Caxias'],
  MT: ['Cuiaba', 'Varzea Grande', 'Rondonopolis'],
  MS: ['Campo Grande', 'Dourados', 'Tres Lagoas'],
  MG: ['Belo Horizonte', 'Uberlandia', 'Contagem'],
  PA: ['Belem', 'Ananindeua', 'Santarem'],
  PB: ['Joao Pessoa', 'Campina Grande', 'Patos'],
  PR: ['Curitiba', 'Londrina', 'Maringa'],
  PE: ['Recife', 'Jaboatao dos Guararapes', 'Olinda'],
  PI: ['Teresina', 'Parnaiba', 'Picos'],
  RJ: ['Rio de Janeiro', 'Niteroi', 'Duque de Caxias'],
  RN: ['Natal', 'Mossoro', 'Parnamirim'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Pelotas'],
  RO: ['Porto Velho', 'Ji-Parana', 'Ariquemes'],
  RR: ['Boa Vista', 'Rorainopolis', 'Caracarai'],
  SC: ['Florianopolis', 'Joinville', 'Blumenau'],
  SP: ['Sao Paulo', 'Campinas', 'Santos'],
  SE: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto'],
  TO: ['Palmas', 'Araguaina', 'Gurupi'],
};

const profileFields = [
  { key: 'name', label: 'Nome completo', icon: FaUser, placeholder: 'Ex.: Ana Rodrigues', inputType: 'text' },
  { key: 'preferredName', label: 'Nome preferido', icon: FaUser, placeholder: 'Ex.: Ana', inputType: 'text' },
  { key: 'email', label: 'E-mail', icon: FaEnvelope, placeholder: 'voce@email.com', inputType: 'email' },
  { key: 'phone', label: 'Telefone', icon: FaPhone, placeholder: '(11) 99999-9999', inputType: 'tel' },
  { key: 'cpf', label: 'CPF', icon: FaIdCard, placeholder: '000.000.000-00', inputType: 'text' },
  { key: 'birthDate', label: 'Data de nascimento', icon: FaCalendarDays, placeholder: 'dd/mm/aaaa', inputType: 'text' },
  { key: 'state', label: 'Estado', icon: FaMapLocationDot, placeholder: 'Selecione seu estado', inputType: 'select-state' },
  { key: 'city', label: 'Cidade', icon: FaLocationDot, placeholder: 'Selecione sua cidade', inputType: 'select-city' },
] as const;

export default function ProfileAccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetails>(emptyProfile);
  const [draft, setDraft] = useState<ProfileDetails>(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [message, setMessage] = useState('');
  const editScrollTargetRef = useRef<HTMLDivElement | null>(null);

  const emailForOtp = useMemo(() => profile.email || draft.email, [draft.email, profile.email]);
  const hasChanges = useMemo(() => profileFields.some(({ key }) => draft[key] !== profile[key]) || draft.marketingOptIn !== profile.marketingOptIn, [draft, profile]);
  const cityOptions = useMemo(() => {
    const options = citiesByState[draft.state] || [];
    if (draft.city && !options.includes(draft.city)) return [draft.city, ...options];
    return options;
  }, [draft.city, draft.state]);

  useEffect(() => {
    const session = localStorage.getItem('flux_user_session');
    let base = emptyProfile;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        base = {
          ...base,
          name: parsed.name || '',
          email: parsed.email || '',
        };
      } catch (err) {
        localStorage.removeItem('flux_user_session');
      }
    }

    const saved = localStorage.getItem('flux_profile_details');
    if (saved) {
      try {
        base = { ...base, ...JSON.parse(saved) };
      } catch (err) {
        localStorage.removeItem('flux_profile_details');
      }
    }

    setProfile(base);
    setDraft(base);
  }, []);

  useEffect(() => {
    if (!editing) return;

    // Wait for the editable fields to mount before measuring the target position.
    const scrollTimer = window.setTimeout(() => {
      const target = editScrollTargetRef.current;
      if (!target) return;

      const absoluteTop = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, absoluteTop - 72), behavior: 'smooth' });
    }, 80);

    return () => window.clearTimeout(scrollTimer);
  }, [editing]);

  const startEditing = () => {
    setEditing(true);
    setMessage('');
  };

  const requestOtp = async () => {
    if (!hasChanges) {
      setMessage('Altere alguma informacao antes de solicitar o codigo.');
      return;
    }
    if (!emailForOtp) {
      setMessage('Informe um e-mail antes de editar os dados.');
      return;
    }

    setLoadingOtp(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: emailForOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nao foi possivel enviar o codigo.');
      setOtpStep('sent');
      setMessage('Codigo enviado para seu e-mail.');
    } catch (err: any) {
      setMessage(err.message || 'Falha ao enviar codigo.');
    } finally {
      setLoadingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setLoadingOtp(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email: emailForOtp, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Codigo invalido.');
      if (data.user) localStorage.setItem('flux_user_session', JSON.stringify(data.user));
      setOtpStep('verified');
      setMessage('Identidade confirmada. Voce pode salvar alteracoes.');
    } catch (err: any) {
      setMessage(err.message || 'Falha ao validar codigo.');
    } finally {
      setLoadingOtp(false);
    }
  };

  const saveProfile = () => {
    if (!hasChanges) {
      setMessage('Nenhuma alteracao para salvar.');
      return;
    }

    if (otpStep !== 'verified') {
      setMessage('Confirme o codigo enviado por e-mail antes de salvar.');
      return;
    }

    localStorage.setItem('flux_profile_details', JSON.stringify(draft));
    const session = localStorage.getItem('flux_user_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        localStorage.setItem('flux_user_session', JSON.stringify({
          ...parsed,
          name: draft.name || parsed.name,
          email: draft.email || parsed.email,
        }));
      } catch (err) {}
    }
    setProfile(draft);
    setEditing(false);
    setOtpStep('idle');
    setOtpCode('');
    setMessage('Perfil atualizado.');
  };

  const handleProfileAction = () => {
    if (otpStep === 'sent') {
      verifyOtp();
      return;
    }

    if (otpStep === 'verified') {
      saveProfile();
      return;
    }

    requestOtp();
  };

  const actionLabel = loadingOtp
    ? otpStep === 'sent'
      ? 'Confirmando...'
      : 'Enviando...'
    : otpStep === 'sent'
      ? 'Confirmar codigo'
      : otpStep === 'verified'
        ? 'Salvar alteracoes'
        : 'Enviar codigo';

  const updateDraft = (key: keyof ProfileDetails, value: string | boolean) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'state' && value !== current.state) next.city = '';
      return next;
    });
    if (otpStep === 'verified') setOtpStep('idle');
  };

  return (
    <div className="min-h-screen flex flex-col flux-page font-sans antialiased">
      <Header />

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-12">
        <div className="space-y-8">
          <section className="flux-card p-6 md:p-8 rounded-[20px] shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-wide text-[#FF3200]">Dados do Perfil</span>
              <h1 className="text-2xl font-black text-[var(--text)] mt-1">Informacoes da conta</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 max-w-2xl">
                Consulte seus dados e use a verificacao por e-mail para editar informacoes sensiveis.
              </p>
            </div>
          </section>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <aside className="w-full md:w-52 shrink-0 flux-card p-3 space-y-1 shadow-sm">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-[14px] text-xs text-left transition-colors cursor-pointer ${
                    item.active
                      ? 'font-bold bg-[#FF3200]/10 text-[#FF3200]'
                      : 'font-semibold text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </aside>

            <section className="flex-grow w-full space-y-5">
              <div className="flux-card p-6 rounded-[20px] space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[20px] bg-[#FF3200] text-white flex items-center justify-center font-black text-xl">
                  {(profile.name || profile.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-black text-[var(--text)]">{profile.name || 'Usuario Flux'}</h2>
                  <p className="text-xs text-[var(--text-muted)]">{profile.email || 'E-mail nao informado'}</p>
                </div>
              </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">
                    A edicao deste bloco exige confirmacao por e-mail antes de salvar qualquer alteracao.
                  </p>
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={loadingOtp || editing}
                    className={`px-5 py-3 rounded-[14px] text-sm font-bold flex items-center gap-2 self-start sm:self-auto border transition-all ${
                      editing
                        ? 'bg-[var(--surface-muted)] text-[var(--text-subtle)] border-[var(--border)] cursor-not-allowed'
                        : 'bg-[#FF3200] hover:bg-[#E62D00] text-white border-transparent'
                    } ${loadingOtp ? 'opacity-70' : ''}`}
                  >
                    {loadingOtp ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaPen className="w-4 h-4" />}
                    Editar dados
                  </button>
                </div>

                {message && (
                  <div className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-[14px] p-3">
                    {message}
                  </div>
                )}

                <div ref={editScrollTargetRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
                  {profileFields.map(({ key, label, icon: Icon, placeholder, inputType }) => (
                    <label key={key} className="flux-muted-surface border rounded-[14px] p-4 flex gap-3">
                      <Icon className="w-4 h-4 text-[#FF3200] mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] font-bold text-[var(--text-subtle)]">{label}</span>
                        {editing && inputType === 'select-state' ? (
                          <select
                            value={draft.state}
                            onChange={(event) => updateDraft('state', event.target.value)}
                            className="flux-input w-full px-3 py-2 text-sm"
                          >
                            <option value="">{placeholder}</option>
                            {brazilStates.map((stateOption) => (
                              <option key={stateOption.value} value={stateOption.value}>
                                {stateOption.label}
                              </option>
                            ))}
                          </select>
                        ) : editing && inputType === 'select-city' ? (
                          <select
                            value={draft.city}
                            onChange={(event) => updateDraft('city', event.target.value)}
                            className="flux-input w-full px-3 py-2 text-sm"
                            disabled={!draft.state}
                          >
                            <option value="">{draft.state ? placeholder : 'Selecione o estado primeiro'}</option>
                            {cityOptions.map((cityOption) => (
                              <option key={cityOption} value={cityOption}>
                                {cityOption}
                              </option>
                            ))}
                          </select>
                        ) : editing ? (
                          <input
                            type={inputType}
                            value={draft[key]}
                            onChange={(event) => updateDraft(key, event.target.value)}
                            className="flux-input w-full px-3 py-2 text-sm"
                            placeholder={placeholder}
                          />
                        ) : (
                          <p className="text-sm font-bold text-[var(--text)]">
                            {key === 'state'
                              ? brazilStates.find((stateOption) => stateOption.value === profile.state)?.label || profile.state || 'Nao informado'
                              : profile[key] || 'Nao informado'}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {editing && (
                  <label className="flex items-center gap-3 text-xs font-semibold text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={draft.marketingOptIn}
                      onChange={(event) => updateDraft('marketingOptIn', event.target.checked)}
                    />
                    Aceito receber comunicados sobre eventos, pedidos e beneficios da Flux Tickets.
                  </label>
                )}

                {editing && (
                  <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t border-[var(--border)]">
                    <div className="lg:w-48 lg:shrink-0">
                      <button
                        type="button"
                        onClick={handleProfileAction}
                        disabled={!hasChanges || loadingOtp || (otpStep === 'sent' && otpCode.length < 6)}
                        className="w-full bg-[#FF3200] hover:bg-[#E62D00] text-white px-5 py-3 rounded-[14px] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLabel}
                      </button>
                    </div>

                    {hasChanges && (
                      <div className="flex-1 border border-[#FF3200]/20 bg-[#FF3200]/5 rounded-[14px] p-3 flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)] md:shrink-0">
                          <FaShieldHalved className="text-[#FF3200]" />
                          Verificacao por e-mail
                        </div>
                        {otpStep === 'idle' && (
                          <p className="text-xs font-semibold text-[var(--text-muted)]">
                            Solicite o codigo para confirmar sua identidade antes de salvar.
                          </p>
                        )}
                        {otpStep === 'sent' && (
                          <div className="relative flex-1 min-w-0">
                            <FaKey className="absolute left-4 top-3.5 text-[var(--text-subtle)]" />
                            <input
                              value={otpCode}
                              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="flux-input w-full pl-11 pr-4 py-3 text-sm"
                              placeholder="Codigo de 6 digitos"
                            />
                          </div>
                        )}
                        {otpStep === 'verified' && (
                          <p className="text-xs font-bold text-emerald-600">Identidade confirmada para esta sessao de edicao.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
