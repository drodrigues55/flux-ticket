import test from 'node:test';
import assert from 'node:assert/strict';

// Core business rules validation logic extracted for testing
function validatePublishing(event: any): { isValid: boolean; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!event.title?.trim()) {
    blockers.push('Nome do evento é obrigatório.');
  }
  if (!event.slug?.trim()) {
    blockers.push('Slug do evento é obrigatório.');
  }
  if (!event.date) {
    blockers.push('Data de início é obrigatória.');
  }
  if (event.endDate && event.endDate <= event.date) {
    blockers.push('Data de término deve ser posterior à data de início.');
  }
  if (event.status === 'ARCHIVED') {
    blockers.push('O evento está arquivado e não pode ser publicado.');
  }

  // Media
  if (!event.imageUrl) {
    warnings.push('Banner do evento é recomendado.');
  }

  // Details
  if (!event.description?.trim()) {
    warnings.push('Descrição completa é recomendada.');
  }
  if (!event.categoryId) {
    warnings.push('Categoria do evento é recomendada.');
  }

  // Location
  if (event.locationType === 'PHYSICAL' || event.locationType === 'HYBRID') {
    if (!event.location?.trim()) {
      blockers.push('Endereço é obrigatório para eventos presenciais/híbridos.');
    }
  }
  if (event.locationType === 'ONLINE' || event.locationType === 'HYBRID') {
    if (!event.onlineUrl?.trim()) {
      warnings.push('Link de transmissão é recomendado para eventos online/híbridos.');
    }
  }

  // Tickets
  if (!event.ticketTypes || event.ticketTypes.length === 0) {
    blockers.push('O evento deve ter pelo menos um tipo de ingresso ativo.');
  } else {
    for (const tt of event.ticketTypes) {
      if (tt.capacity <= 0) {
        blockers.push(`O tipo de ingresso "${tt.name}" deve ter capacidade maior que zero.`);
      }
      if (tt.capacity < 10) {
        warnings.push(`Capacidade baixa no tipo de ingresso "${tt.name}" (${tt.capacity}).`);
      }

      const activeBatches = tt.batches || [];
      if (activeBatches.length === 0) {
        blockers.push(`O tipo de ingresso "${tt.name}" deve ter pelo menos um lote ativo.`);
      } else {
        const totalBatchCapacity = activeBatches.reduce((sum: number, b: any) => sum + b.totalQuantity, 0);
        if (totalBatchCapacity > tt.capacity) {
          blockers.push(`A capacidade total dos lotes do tipo "${tt.name}" (${totalBatchCapacity}) excede a capacidade do tipo de ingresso (${tt.capacity}).`);
        }

        for (const b of activeBatches) {
          if (b.price === null || b.price < 0) {
            blockers.push(`Lote "${b.name}" do tipo "${tt.name}" tem preço inválido.`);
          }
          if (b.totalQuantity <= 0) {
            blockers.push(`Lote "${b.name}" do tipo "${tt.name}" deve ter capacidade maior que zero.`);
          }
          if (b.salesStart && b.salesEnd && b.salesEnd <= b.salesStart) {
            blockers.push(`Lote "${b.name}" do tipo "${tt.name}" tem janela de vendas inválida (fim antes do início).`);
          }
        }
      }
    }
  }

  return {
    isValid: blockers.length === 0,
    blockers,
    warnings
  };
}

// Test cases
test('rejects publishing a blank/draft event with no details', () => {
  const event = {
    title: '',
    slug: '',
    date: null,
    locationType: 'PHYSICAL',
    location: '',
    ticketTypes: []
  };

  const res = validatePublishing(event);
  assert.equal(res.isValid, false);
  assert.ok(res.blockers.includes('Nome do evento é obrigatório.'));
  assert.ok(res.blockers.includes('Slug do evento é obrigatório.'));
  assert.ok(res.blockers.includes('Data de início é obrigatória.'));
  assert.ok(res.blockers.includes('Endereço é obrigatório para eventos presenciais/híbridos.'));
  assert.ok(res.blockers.includes('O evento deve ter pelo menos um tipo de ingresso ativo.'));
});

test('classifies optional details omissions as warnings instead of blockers', () => {
  const event = {
    title: 'Show Case',
    slug: 'show-case',
    date: new Date(),
    locationType: 'ONLINE',
    onlineUrl: '',
    imageUrl: '',
    description: '',
    categoryId: null,
    ticketTypes: [
      {
        id: 'tt-1',
        name: 'Normal',
        capacity: 100,
        batches: [
          { id: 'b-1', name: 'Lote 1', price: 50, totalQuantity: 100 }
        ]
      }
    ]
  };

  const res = validatePublishing(event);
  assert.equal(res.isValid, true);
  assert.equal(res.blockers.length, 0);
  assert.ok(res.warnings.includes('Banner do evento é recomendado.'));
  assert.ok(res.warnings.includes('Descrição completa é recomendada.'));
  assert.ok(res.warnings.includes('Categoria do evento é recomendada.'));
  assert.ok(res.warnings.includes('Link de transmissão é recomendado para eventos online/híbridos.'));
});

test('rejects publishing if ticket batches exceed capacity', () => {
  const event = {
    title: 'Show Case',
    slug: 'show-case',
    date: new Date(),
    locationType: 'ONLINE',
    onlineUrl: 'https://transmissao.com',
    imageUrl: 'banner.png',
    description: 'A great event',
    categoryId: 1,
    ticketTypes: [
      {
        id: 'tt-1',
        name: 'Normal',
        capacity: 100,
        batches: [
          { id: 'b-1', name: 'Lote 1', price: 50, totalQuantity: 150 }
        ]
      }
    ]
  };

  const res = validatePublishing(event);
  assert.equal(res.isValid, false);
  assert.ok(res.blockers.some(b => b.includes('excede a capacidade do tipo de ingresso')));
});

test('rejects publishing archived events', () => {
  const event = {
    title: 'Show Case',
    slug: 'show-case',
    date: new Date(),
    status: 'ARCHIVED',
    ticketTypes: []
  };

  const res = validatePublishing(event);
  assert.equal(res.isValid, false);
  assert.ok(res.blockers.includes('O evento está arquivado e não pode ser publicado.'));
});
