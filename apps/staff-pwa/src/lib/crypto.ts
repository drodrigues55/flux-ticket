import db from './db';
import { getAllowedSectorIds } from './devicePolicy';

export interface ScannedQRData {
  ticket_id: string;
  buyer_cpf: string;
  batch_id: string;
  sector_id?: number;
  signature: string;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  ticketId?: string;
}

/**
 * Valida o ingresso escaneado offline comparando a assinatura contida no QR Code
 * com a assinatura original armazenada no banco local (IndexedDB).
 * Se for válido, registra a intenção de check-in na fila de sincronização.
 */
export async function validateTicket(
  scannedData: string,
  operatorName?: string,
  operatorCpf?: string
): Promise<ValidationResult> {
  let parsed: ScannedQRData;
  
  try {
    parsed = JSON.parse(scannedData) as ScannedQRData;
  } catch (error) {
    return {
      success: false,
      message: 'Formato de QR Code inválido. Não foi possível decodificar os dados.',
    };
  }

  const ticketId = (parsed as any).ticketId || parsed.ticket_id;
  const signature = parsed.signature;
  const version = (parsed as any).version ?? 1;

  if (!ticketId || !signature) {
    return {
      success: false,
      message: 'Dados do ingresso incompletos no QR Code escaneado.',
    };
  }

  try {
    // 1. Busca o ingresso local pelo ID
    const localRecord = await db.validTickets.get(ticketId);

    if (!localRecord) {
      return {
        success: false,
        message: 'Ingresso não encontrado ou não cadastrado para este evento offline.',
      };
    }

    // 2. Faz a comparação direta de string da assinatura
    if (localRecord.hmacSignature !== signature) {
      return {
        success: false,
        message: 'Assinatura inválida! O ingresso pode ter sido clonado ou adulterado.',
      };
    }

    // 3. Bloqueia setores fora da política do dispositivo, quando configurada.
    const allowedSectorIds = getAllowedSectorIds();
    if (allowedSectorIds.length > 0) {
      const ticketSectorId = localRecord.sectorId ?? parsed.sector_id ?? null;
      if (!ticketSectorId || !allowedSectorIds.includes(Number(ticketSectorId))) {
        return {
          success: false,
          message: 'Ingresso pertence a um setor não autorizado para este dispositivo.',
        };
      }
    }

    // 4. Verifica se o ingresso já foi marcado para consumo localmente
    const alreadyScanned = await db.mutationQueue.get(ticketId);
    if (alreadyScanned) {
      return {
        success: false,
        message: 'Ingresso já escaneado! Entrada duplicada bloqueada offline.',
      };
    }

    // 5. Se a assinatura for idêntica e não consumido ainda, enfileira a mutação com dados ricos e offlineId
    await db.mutationQueue.put({
      ticket_id: ticketId,
      timestamp: Date.now(),
      status: 'PENDING_SYNC',
      offlineId: `offline-${ticketId}-${Date.now()}`,
      hmacSignature: signature,
      sectorId: localRecord.sectorId ?? null,
      version: version,
      operatorName: operatorName || null,
      operatorCpf: operatorCpf || null,
    } as any);

    console.log(`[EDGE VALIDATION] Ticket ${ticketId} validado com sucesso offline.`);

    return {
      success: true,
      message: 'Ingresso AUTÊNTICO e validado! Check-in registrado offline com sucesso.',
      ticketId: ticketId,
    };
  } catch (error: any) {
    console.error('[EDGE VALIDATION ERROR] Erro na validação local:', error);
    return {
      success: false,
      message: `Erro interno ao validar ingresso localmente: ${error.message || error}`,
    };
  }
}
