import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import EventLayout from '../../../../../components/EventLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flux/ui';

type Tab = 'information' | 'batches' | 'rules';

interface ApiError {
  message: string;
  requestId?: string;
}

export default function TicketTypeWorkspacePage() {
  const router = useRouter();
  const { eventId, ticketTypeId, tab } = router.query as { eventId: string; ticketTypeId: string; tab: Tab };

  const [eventName, setEventName] = useState('Carregando...');
  const [detail, setDetail] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>({ isValid: true, errors: [], warnings: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Forms state
  const [infoForm, setInfoForm] = useState({
    name: '',
    description: '',
    capacity: 0,
    visibility: true,
    isActive: true,
    basePrice: 0,
  });

  const [rulesForm, setRulesForm] = useState({
    purchaseLimit: 5,
    refundable: true,
    transferable: true,
    visibility: true,
  });

  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmBatchArchiveId, setConfirmBatchArchiveId] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!eventId || !ticketTypeId) return;
    try {
      // Get Event details for layout header
      const eventRes = await fetch(`/api/organizer/events/${eventId}`);
      const eventJson = await eventRes.json();
      if (eventRes.ok && eventJson.data) {
        setEventName(eventJson.data.event.name);
      }

      // Get Ticket Type details
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}`);
      const json = await res.json();
      if (!res.ok) {
        throw json.error || { message: 'Falha ao carregar detalhes do tipo de ingresso.' };
      }
      const data = json.data;
      setDetail(data);

      setInfoForm({
        name: data.information.name || '',
        description: data.information.description || '',
        capacity: data.information.capacity || 0,
        visibility: data.information.visibility,
        isActive: data.information.isActive,
        basePrice: data.batches.length === 1 ? data.batches[0].price : 0,
      });

      setRulesForm({
        purchaseLimit: data.rules.purchaseLimit || 5,
        refundable: data.rules.refundable,
        transferable: data.rules.transferable,
        visibility: data.rules.visibility,
      });
    } catch (err: any) {
      setError(err);
    }
  };

  const fetchBatchesData = async () => {
    if (!eventId || !ticketTypeId) return;
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches`);
      const json = await res.json();
      if (res.ok) {
        setBatches(json.data);
      }

      const valRes = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches/validation`);
      const valJson = await valRes.json();
      if (valRes.ok) {
        setValidation(valJson.data);
      }
    } catch (err: any) {
      console.error('Error loading batches', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchDetail(), fetchBatchesData()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [eventId, ticketTypeId]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: infoForm.name,
        description: infoForm.description || undefined,
        capacity: Number(infoForm.capacity),
        visibility: infoForm.visibility,
        isActive: infoForm.isActive,
      };
      if (detail?.batches?.length === 1) {
        payload.basePrice = Number(infoForm.basePrice);
      }

      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/information`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw json.error || { message: 'Falha ao salvar informações básicas.' };
      }
      await loadAll();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/rules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseLimit: Number(rulesForm.purchaseLimit),
          refundable: rulesForm.refundable,
          transferable: rulesForm.transferable,
          visibility: rulesForm.visibility,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw json.error || { message: 'Falha ao salvar regras de compra.' };
      }
      await loadAll();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/duplicate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw json.error || { message: 'Falha ao duplicar o tipo de ingresso.' };
      }
      const duplicated = json.data;
      router.push(`/events/${eventId}/tickets/${duplicated.id}/information`);
    } catch (err: any) {
      setError(err);
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/archive`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw json.error || { message: 'Falha ao arquivar o tipo de ingresso.' };
      }
      setConfirmArchive(false);
      router.push(`/events/${eventId}/tickets`);
    } catch (err: any) {
      setError(err);
      setSaving(false);
    }
  };

  // Batch actions
  const handleBatchDuplicate = async (batchId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches/${batchId}/duplicate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Failed to duplicate batch.' };
      await fetchBatchesData();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchArchive = async () => {
    if (!confirmBatchArchiveId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches/${confirmBatchArchiveId}/archive`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Failed to archive batch.' };
      setConfirmBatchArchiveId(null);
      await fetchBatchesData();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchActivate = async (batchId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches/${batchId}/activate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Failed to activate batch.' };
      await fetchBatchesData();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchClose = async (batchId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches/${batchId}/close`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Failed to close batch.' };
      await fetchBatchesData();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === batches.length - 1) return;

    const newBatches = [...batches];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    const temp = newBatches[index];
    newBatches[index] = newBatches[swapWith];
    newBatches[swapWith] = temp;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds: newBatches.map(b => b.id) }),
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Failed to reorder batches.' };
      await fetchBatchesData();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <EventLayout eventId={eventId} eventName={eventName}>
        <div className="p-8 text-sm text-neutral-500">Carregando painel do ingresso...</div>
      </EventLayout>
    );
  }

  const isArchived = detail?.information.status === 'ARCHIVED';

  return (
    <EventLayout eventId={eventId} eventName={eventName}>
      <div className={`space-y-6 mt-4 ${isArchived ? 'opacity-70' : ''}`}>
        {/* Back Link & Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Link href={`/events/${eventId}/tickets`} className="text-sm font-bold text-neutral-500 hover:text-neutral-700">
            ← Voltar para Ingressos
          </Link>
          {!isArchived && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={saving}>
                Duplicar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmArchive(true)} disabled={saving}>
                Arquivar
              </Button>
            </div>
          )}
        </div>

        {/* Title and Status */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">{detail?.information.name}</h1>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
            detail?.information.status === 'ACTIVE' ? 'bg-green-50 border-green-200 text-green-600' :
            detail?.information.status === 'HIDDEN' ? 'bg-amber-50 border-amber-200 text-amber-600' :
            'bg-neutral-100 border-neutral-300 text-neutral-500'
          }`}>
            {detail?.information.status}
          </span>
        </div>

        {/* Error box */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-1">
            <p className="font-semibold">{error.message}</p>
            {error.requestId && <p className="text-xs font-mono text-red-500">Request ID: {error.requestId}</p>}
          </div>
        )}

        {/* Secondary Nav Tabs */}
        <div className="flex border-b border-neutral-200 gap-6">
          <Link
            href={`/events/${eventId}/tickets/${ticketTypeId}/information`}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              tab === 'information' ? 'border-[#FF3200] text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Informações Básicas
          </Link>
          <Link
            href={`/events/${eventId}/tickets/${ticketTypeId}/batches`}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              tab === 'batches' ? 'border-[#FF3200] text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Lotes de Venda
          </Link>
          <Link
            href={`/events/${eventId}/tickets/${ticketTypeId}/rules`}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              tab === 'rules' ? 'border-[#FF3200] text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Regras de Compra
          </Link>
        </div>

        {/* Form / Content rendering */}
        {tab === 'information' && (
          <Card className="rounded-lg bg-white">
            <CardHeader><CardTitle>Editar Informações</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Nome</span>
                    <Input value={infoForm.name} onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })} required disabled={isArchived} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Capacidade</span>
                    <Input type="number" value={infoForm.capacity} onChange={(e) => setInfoForm({ ...infoForm, capacity: Number(e.target.value) })} required disabled={isArchived} />
                  </label>
                  {detail?.batches?.length === 1 && (
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-neutral-600">Preço Padrão (R$)</span>
                      <Input type="number" step="0.01" value={infoForm.basePrice} onChange={(e) => setInfoForm({ ...infoForm, basePrice: Number(e.target.value) })} required disabled={isArchived} />
                    </label>
                  )}
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Status Ativo</span>
                    <select
                      className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-sm bg-white"
                      value={infoForm.isActive ? 'true' : 'false'}
                      onChange={(e) => setInfoForm({ ...infoForm, isActive: e.target.value === 'true' })}
                      disabled={isArchived}
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-neutral-600">Descrição</span>
                  <textarea
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm"
                    rows={4}
                    value={infoForm.description}
                    onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                    disabled={isArchived}
                  />
                </label>
                {!isArchived && (
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {tab === 'batches' && (
          <div className="space-y-6">
            {/* Validation Feedback */}
            {!validation.isValid && validation.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-1">
                <p className="font-bold">Erros de validação na configuração dos lotes:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validation.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 space-y-1">
                <p className="font-bold">Avisos de configuração:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validation.warnings.map((warn: string, i: number) => <li key={i}>{warn}</li>)}
                </ul>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-neutral-900">Lotes Cadastrados</h2>
              {!isArchived && (
                <Link href={`/events/${eventId}/tickets/${ticketTypeId}/batches/new`}>
                  <Button size="sm">Criar Novo Lote</Button>
                </Link>
              )}
            </div>

            {batches.length === 0 ? (
              <Card className="rounded-lg bg-white"><CardContent className="p-12 text-center text-neutral-500 space-y-4">
                <p>Nenhum lote criado para este tipo de ingresso.</p>
                {!isArchived && (
                  <Link href={`/events/${eventId}/tickets/${ticketTypeId}/batches/new`}>
                    <Button variant="outline">Criar Primeiro Lote</Button>
                  </Link>
                )}
              </CardContent></Card>
            ) : (
              <Card className="rounded-lg bg-white overflow-hidden">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      <th className="px-6 py-3 w-12 text-center">Posição</th>
                      <th className="px-6 py-3">Nome do Lote</th>
                      <th className="px-6 py-3">Preço</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Capacidade (V/T)</th>
                      <th className="px-6 py-3">Vendas</th>
                      <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] font-medium text-sm text-neutral-700">
                    {batches.map((batch: any, index: number) => {
                      const isBatchClosed = batch.status === 'COMPLETED';
                      return (
                        <tr key={batch.id} className={`hover:bg-neutral-50/50 transition-colors ${isBatchClosed ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4 text-center">
                            {!isArchived && (
                              <div className="flex flex-col items-center">
                                <button
                                  type="button"
                                  onClick={() => handleReorder(index, 'up')}
                                  disabled={index === 0 || saving}
                                  className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 cursor-pointer"
                                >
                                  ▲
                                </button>
                                <span className="font-mono text-xs">{batch.displayOrder}</span>
                                <button
                                  type="button"
                                  onClick={() => handleReorder(index, 'down')}
                                  disabled={index === batches.length - 1 || saving}
                                  className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 cursor-pointer"
                                >
                                  ▼
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-neutral-900">{batch.name}</div>
                          </td>
                          <td className="px-6 py-4 text-[#FF3200] font-bold font-mono">
                            {batch.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase border ${
                              batch.status === 'ACTIVE' ? 'bg-green-50 border-green-200 text-green-600' :
                              batch.status === 'PENDING' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                              batch.status === 'COMPLETED' ? 'bg-neutral-100 border-neutral-300 text-neutral-500' :
                              'bg-amber-50 border-amber-200 text-amber-600'
                            }`}>
                              {batch.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {batch.soldQuantity} / {batch.totalQuantity}
                          </td>
                          <td className="px-6 py-4 text-xs font-normal text-neutral-500">
                            <div>Início: {batch.salesStart ? new Date(batch.salesStart).toLocaleDateString('pt-BR') : 'Imediato'}</div>
                            <div>Fim: {batch.salesEnd ? new Date(batch.salesEnd).toLocaleDateString('pt-BR') : 'Até o evento'}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Link href={`/events/${eventId}/tickets/${ticketTypeId}/batches/${batch.id}/preview`}>
                                <Button size="sm" variant="outline">Preview</Button>
                              </Link>
                              {!isArchived && !isBatchClosed && (
                                <>
                                  <Link href={`/events/${eventId}/tickets/${ticketTypeId}/batches/${batch.id}`}>
                                    <Button size="sm" variant="secondary">Editar</Button>
                                  </Link>
                                  <Button size="sm" variant="outline" onClick={() => handleBatchDuplicate(batch.id)}>Duplicar</Button>
                                  {batch.status === 'PENDING' && (
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleBatchActivate(batch.id)}>Ativar</Button>
                                  )}
                                  {batch.status === 'ACTIVE' && (
                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleBatchClose(batch.id)}>Encerrar</Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => setConfirmBatchArchiveId(batch.id)}>Arquivar</Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {tab === 'rules' && (
          <Card className="rounded-lg bg-white">
            <CardHeader><CardTitle>Regras de Compra</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRules} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Mínimo por Compra</span>
                    <Input type="number" value={1} disabled />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Máximo por Compra</span>
                    <Input type="number" value={rulesForm.purchaseLimit} onChange={(e) => setRulesForm({ ...rulesForm, purchaseLimit: Number(e.target.value) })} required disabled={isArchived} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Reembolsável</span>
                    <select
                      className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-sm bg-white"
                      value={rulesForm.refundable ? 'true' : 'false'}
                      onChange={(e) => setRulesForm({ ...rulesForm, refundable: e.target.value === 'true' })}
                      disabled={isArchived}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Transferível</span>
                    <select
                      className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-sm bg-white"
                      value={rulesForm.transferable ? 'true' : 'false'}
                      onChange={(e) => setRulesForm({ ...rulesForm, transferable: e.target.value === 'true' })}
                      disabled={isArchived}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-600">Visibilidade</span>
                    <select
                      className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-sm bg-white"
                      value={rulesForm.visibility ? 'true' : 'false'}
                      onChange={(e) => setRulesForm({ ...rulesForm, visibility: e.target.value === 'true' })}
                      disabled={isArchived}
                    >
                      <option value="true">Público</option>
                      <option value="false">Oculto</option>
                    </select>
                  </label>
                </div>
                {!isArchived && (
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Regras'}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-950">Arquivar tipo de ingresso?</h2>
            <p className="text-sm text-neutral-500">
              Esta ação desabilitará o tipo de ingresso e seus lotes para vendas futuras. Ingressos já emitidos continuam válidos. Essa ação não pode ser desfeita nesta versão.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmArchive(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleArchive} disabled={saving}>{saving ? 'Arquivando...' : 'Arquivar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Archive Confirmation Modal */}
      {confirmBatchArchiveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-950">Arquivar lote de ingresso?</h2>
            <p className="text-sm text-neutral-500">
              Esta ação desabilitará o lote de ingressos para vendas futuras. Ingressos já emitidos continuam válidos. Essa ação não pode ser desfeita nesta versão.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmBatchArchiveId(null)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleBatchArchive} disabled={saving}>{saving ? 'Arquivando...' : 'Arquivar'}</Button>
            </div>
          </div>
        </div>
      )}
    </EventLayout>
  );
}
