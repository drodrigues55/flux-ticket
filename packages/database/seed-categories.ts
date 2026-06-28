import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_ORGANIZER_ID = 'organizer-mock';
const DEMO_ORGANIZER_EMAIL = 'mock-organizer@flux.com';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('\n=== SEEDING EVENTS WITH DYNAMIC PRICES ===\n');

  // 1. Limpar dados antigos para evitar duplicidade
  await prisma.checkin.deleteMany({});
  await (prisma as any).ticketStatusHistory?.deleteMany({});
  await prisma.ticket.deleteMany({});
  await (prisma as any).saleLog?.deleteMany({});
  await prisma.payment.deleteMany({});
  await (prisma as any).reservationItem?.deleteMany({});
  await (prisma as any).reservation?.deleteMany({});
  await prisma.order.deleteMany({});
  await (prisma as any).waitlistEntry?.deleteMany({});
  await prisma.ticketBatch.deleteMany({});
  await prisma.ticketType.deleteMany({});
  await (prisma as any).eventAlert?.deleteMany({});
  await (prisma as any).dailySalesSnapshot?.deleteMany({});
  await prisma.payout.deleteMany({});
  await prisma.event.deleteMany({});
  await (prisma as any).auditLog?.deleteMany({});
  await prisma.outboxEvent.deleteMany({});
  await (prisma as any).organizationMember?.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Garantir organizador
  const user = await prisma.user.create({
    data: {
      id: DEMO_ORGANIZER_ID,
      email: DEMO_ORGANIZER_EMAIL,
      password: 'password123',
      name: 'Mock Organizer',
      role: 'ORGANIZER',
    },
  });
  const organizerId = user.id;

  // Função auxiliar com preços específicos por evento
  async function createEvent(
    title: string,
    description: string,
    date: string,
    location: string,
    categoryId: number,
    prices: { superior: number; vip: number; premium: number },
    supportsHalfPrice: boolean = false,
    status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED'
  ) {
    const slug = slugify(title);
    const event = await prisma.event.create({
      data: { 
        title, 
        slug,
        shortDescription: description.slice(0, 140),
        description, 
        date: new Date(date), 
        location, 
        timezone: 'America/Cuiaba',
        locationType: 'PHYSICAL',
        venue: location.split(' - ')[0] || location,
        country: 'BR',
        imageUrl: `https://picsum.photos/seed/flux-${slug}/1200/630`,
        capacityTarget: 1500,
        categoryId, 
        organizerId,
        status: status as any
      },
    });

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: 'General Admission',
        description: 'Default ticket type',
        capacity: 1500,
        visibility: true,
        transferable: true,
        refundable: true,
        purchaseLimit: 5,
        isActive: true,
      }
    });

    const eventBatches = [
      { name: 'PLATEIA SUPERIOR', price: prices.superior, totalQuantity: 300, availableQuantity: 300, sectorId: 1, sectorName: 'PLATEIA SUPERIOR', meiaEntrada: false, status: 'ACTIVE' as const, isActive: true },
      { name: 'PLATEIA VIP',      price: prices.vip, totalQuantity: 200, availableQuantity: 200, sectorId: 2, sectorName: 'PLATEIA VIP', meiaEntrada: false, status: 'ACTIVE' as const, isActive: true },
      { name: 'PLATEIA PREMIUM',  price: prices.premium, totalQuantity: 150, availableQuantity: 150, sectorId: 3, sectorName: 'PLATEIA PREMIUM', meiaEntrada: false, status: 'ACTIVE' as const, isActive: true },
    ];

    if (supportsHalfPrice) {
      eventBatches.push(
        { name: 'PLATEIA SUPERIOR - MEIA', price: prices.superior * 0.5, totalQuantity: 300, availableQuantity: 300, sectorId: 1, sectorName: 'PLATEIA SUPERIOR', meiaEntrada: true, status: 'ACTIVE' as const, isActive: true },
        { name: 'PLATEIA VIP - MEIA',      price: prices.vip * 0.5, totalQuantity: 200, availableQuantity: 200, sectorId: 2, sectorName: 'PLATEIA VIP', meiaEntrada: true, status: 'ACTIVE' as const, isActive: true },
        { name: 'PLATEIA PREMIUM - MEIA',  price: prices.premium * 0.5, totalQuantity: 150, availableQuantity: 150, sectorId: 3, sectorName: 'PLATEIA PREMIUM', meiaEntrada: true, status: 'ACTIVE' as const, isActive: true }
      );
    }

    for (const batch of eventBatches) {
      await prisma.ticketBatch.create({ 
        data: { 
          ...batch, 
          eventId: event.id,
          ticketTypeId: ticketType.id
        } 
      });
    }
    console.log(`  ✅ "${title}" cadastrado como ${status} (Superior: R$ ${prices.superior}, VIP: R$ ${prices.vip}, Premium: R$ ${prices.premium}, Meia: ${supportsHalfPrice ? 'Sim' : 'Não'})`);
    return event;
  }

  // 3. Cadastrar Shows (Categoria 1)
  await createEvent(
    'Bee Gees Alive - Anapolis',
    'Bee Gees Alive apresenta show em comemoração aos 25 anos de carreira. Espetáculo faz parte da turnê 2026 e traz novidades para o público.',
    '2026-08-14T20:00:00Z',
    'Teatro São Francisco',
    1,
    { superior: 110.00, vip: 140.00, premium: 160.00 },
    true
  );

  await createEvent(
    'Rock in Rio 2026',
    'O maior festival de música do Brasil de volta com line-up histórico.',
    '2026-10-01T19:00:00Z',
    'Cidade do Rock - Rio de Janeiro RJ',
    1,
    { superior: 220.00, vip: 380.00, premium: 490.00 },
    true
  );

  await createEvent(
    'Coldplay | Music of the Spheres',
    'A turnê mais esperada de 2026 chega ao Brasil com show imersivo e luzes LED.',
    '2026-11-15T20:00:00Z',
    'Allianz Parque - São Paulo SP',
    1,
    { superior: 250.00, vip: 420.00, premium: 580.00 },
    false
  );

  // 4. Cadastrar Teatro (Categoria 2)
  await createEvent(
    'Hamlet - O Musical',
    'Adaptação moderna de Shakespeare com trilha sonora original ao vivo.',
    '2026-08-20T19:30:00Z',
    'Teatro Municipal - São Paulo SP',
    2,
    { superior: 80.00, vip: 120.00, premium: 160.00 },
    false
  );

  await createEvent(
    'Chicago - O Musical',
    'O clássico da Broadway em temporada especial no Brasil.',
    '2026-09-12T20:00:00Z',
    'Teatro Alfa - São Paulo SP',
    2,
    { superior: 90.00, vip: 130.00, premium: 180.00 },
    true
  );

  // 5. Cadastrar Esportes (Categoria 3)
  await createEvent(
    'Final da Copa do Brasil 2026',
    'A grande decisão do campeonato mais emocionante do futebol nacional.',
    '2026-12-06T17:00:00Z',
    'Estádio Mané Garrincha - Brasília DF',
    3,
    { superior: 150.00, vip: 280.00, premium: 450.00 },
    false
  );

  await createEvent(
    'UFC Fight Night Brasil',
    'Os melhores lutadores do mundo se enfrentam em combates eletrizantes.',
    '2026-11-28T18:00:00Z',
    'Arena Carioca 1 - Rio de Janeiro RJ',
    3,
    { superior: 120.00, vip: 220.00, premium: 350.00 },
    false
  );

  // 6. Cadastrar Infantis (Categoria 4)
  await createEvent(
    'Turma da Mônica em Cena',
    'As famosas histórias em quadrinhos ganham vida em um espetáculo musical super divertido.',
    '2026-10-12T15:00:00Z',
    'Teatro das Artes - Rio de Janeiro RJ',
    4,
    { superior: 50.00, vip: 80.00, premium: 110.00 },
    false
  );

  await createEvent(
    'Galinha Pintadinha ao Vivo',
    'Show interativo com músicas, dança e surpresas para toda a família.',
    '2026-07-19T16:00:00Z',
    'Ginásio Nilson Nelson - Brasília DF',
    4,
    { superior: 60.00, vip: 95.00, premium: 130.00 },
    false
  );

  console.log('\n=== SEEDING DRAFT, READY, SOLD-OUT AND PAST EVENTS ===\n');

  // Draft event with publishing blocker
  await prisma.event.create({
    data: {
      title: 'Draft Event Blocked',
      slug: 'draft-event-blocked',
      shortDescription: 'This is a draft event with publishing blockers.',
      description: 'Missing ticket types and active batches.',
      date: new Date('2026-09-01T20:00:00Z'),
      location: 'Teatro São Francisco',
      timezone: 'America/Cuiaba',
      locationType: 'PHYSICAL',
      venue: 'Teatro São Francisco',
      country: 'BR',
      imageUrl: 'https://picsum.photos/seed/flux-draft-blocked/1200/630',
      capacityTarget: 1500,
      categoryId: 1,
      organizerId,
      status: 'DRAFT',
    },
  });
  console.log('  ✅ "Draft Event Blocked" cadastrado como DRAFT (Sem ingressos)');

  // Ready-to-publish event
  const readyEvent = await prisma.event.create({
    data: {
      title: 'Ready to Publish Event',
      slug: 'ready-to-publish-event',
      shortDescription: 'This event is ready to be validated and published.',
      description: 'Fully configured basic info and ticket types.',
      date: new Date('2026-09-10T20:00:00Z'),
      location: 'Teatro São Francisco',
      timezone: 'America/Cuiaba',
      locationType: 'PHYSICAL',
      venue: 'Teatro São Francisco',
      country: 'BR',
      imageUrl: 'https://picsum.photos/seed/flux-ready/1200/630',
      capacityTarget: 1500,
      categoryId: 1,
      organizerId,
      status: 'READY_FOR_VALIDATION',
    },
  });
  const readyTicket = await prisma.ticketType.create({
    data: {
      eventId: readyEvent.id,
      name: 'General Admission',
      description: 'Default ticket type',
      capacity: 1000,
      visibility: true,
      isActive: true,
    },
  });
  await prisma.ticketBatch.create({
    data: {
      eventId: readyEvent.id,
      ticketTypeId: readyTicket.id,
      name: 'Lote Único',
      price: 150.00,
      totalQuantity: 1000,
      availableQuantity: 1000,
      status: 'ACTIVE',
      isActive: true,
    },
  });
  console.log('  ✅ "Ready to Publish Event" cadastrado como READY_FOR_VALIDATION');

  // Sold-out event
  const soldOutEvent = await prisma.event.create({
    data: {
      title: 'Sold Out Concert',
      slug: 'sold-out-concert',
      shortDescription: 'This event is completely sold out.',
      description: 'All tickets for this event have been sold.',
      date: new Date('2026-10-15T20:00:00Z'),
      location: 'Arena Carioca - Rio de Janeiro RJ',
      timezone: 'America/Cuiaba',
      locationType: 'PHYSICAL',
      venue: 'Arena Carioca',
      country: 'BR',
      imageUrl: 'https://picsum.photos/seed/flux-sold-out/1200/630',
      capacityTarget: 500,
      categoryId: 1,
      organizerId,
      status: 'PUBLISHED',
    },
  });
  const soldOutTicket = await prisma.ticketType.create({
    data: {
      eventId: soldOutEvent.id,
      name: 'VIP Experience',
      description: 'VIP Admission',
      capacity: 500,
      visibility: true,
      isActive: true,
    },
  });
  await prisma.ticketBatch.create({
    data: {
      eventId: soldOutEvent.id,
      ticketTypeId: soldOutTicket.id,
      name: 'Lote 1',
      price: 300.00,
      totalQuantity: 500,
      availableQuantity: 0,
      status: 'ACTIVE',
      isActive: true,
    },
  });
  console.log('  ✅ "Sold Out Concert" cadastrado como PUBLISHED (Esgotado)');

  // Past event with checkout data
  const pastEvent = await prisma.event.create({
    data: {
      title: 'Yesterday Past Expo',
      slug: 'yesterday-past-expo',
      shortDescription: 'A retro expo that occurred yesterday.',
      description: 'Great exhibition event.',
      date: new Date('2026-06-27T20:00:00Z'),
      location: 'Teatro São Francisco',
      timezone: 'America/Cuiaba',
      locationType: 'PHYSICAL',
      venue: 'Teatro São Francisco',
      country: 'BR',
      imageUrl: 'https://picsum.photos/seed/flux-past/1200/630',
      capacityTarget: 100,
      categoryId: 1,
      organizerId,
      status: 'PUBLISHED',
    },
  });
  const pastTicket = await prisma.ticketType.create({
    data: {
      eventId: pastEvent.id,
      name: 'Standard Entry',
      capacity: 100,
      visibility: true,
      isActive: true,
    },
  });
  const pastBatch = await prisma.ticketBatch.create({
    data: {
      eventId: pastEvent.id,
      ticketTypeId: pastTicket.id,
      name: 'Lote Final',
      price: 50.00,
      totalQuantity: 100,
      availableQuantity: 95,
      status: 'ACTIVE',
      isActive: true,
    },
  });
  console.log('  ✅ "Yesterday Past Expo" cadastrado como PUBLISHED (Passado)');

  // Seed a buyer user
  const buyerUser = await prisma.user.create({
    data: {
      id: 'buyer-mock',
      email: 'demo-buyer@example.com',
      password: 'password123',
      name: 'Demo Buyer',
      role: 'USER',
    },
  });

  // Seed approved order/payment/ticket
  const orderApproved = await prisma.order.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      status: 'PAID',
      grossAmount: 100.00,
      discountAmount: 0.00,
      netAmount: 100.00,
    },
  });
  await prisma.payment.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      orderId: orderApproved.id,
      method: 'PIX',
      status: 'APPROVED',
      amount: 100.00,
      provider: 'MOCK',
    },
  });
  await prisma.ticket.create({
    data: {
      eventId: pastEvent.id,
      batchId: pastBatch.id,
      buyerId: buyerUser.id,
      orderId: orderApproved.id,
      buyerCpf: '11122233344',
      holderName: 'Demo Buyer Approved',
      status: 'VALID',
      hmacSignature: 'secret_valid_123',
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      price: pastBatch.price,
    },
  });

  // Seed pending order/payment
  const orderPending = await prisma.order.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      status: 'CREATED',
      grossAmount: 50.00,
      discountAmount: 0.00,
      netAmount: 50.00,
    },
  });
  await prisma.payment.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      orderId: orderPending.id,
      method: 'CREDIT_CARD',
      status: 'PENDING',
      amount: 50.00,
      provider: 'MOCK',
    },
  });

  // Seed failed order/payment
  const orderFailed = await prisma.order.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      status: 'FAILED',
      grossAmount: 50.00,
      discountAmount: 0.00,
      netAmount: 50.00,
    },
  });
  await prisma.payment.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      orderId: orderFailed.id,
      method: 'PIX',
      status: 'FAILED',
      amount: 50.00,
      provider: 'MOCK',
    },
  });

  // Seed consumed order/payment/ticket/checkin
  const orderConsumed = await prisma.order.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      status: 'PAID',
      grossAmount: 50.00,
      discountAmount: 0.00,
      netAmount: 50.00,
    },
  });
  await prisma.payment.create({
    data: {
      eventId: pastEvent.id,
      buyerId: buyerUser.id,
      orderId: orderConsumed.id,
      method: 'PIX',
      status: 'APPROVED',
      amount: 50.00,
      provider: 'MOCK',
    },
  });
  const ticketConsumed = await prisma.ticket.create({
    data: {
      eventId: pastEvent.id,
      batchId: pastBatch.id,
      buyerId: buyerUser.id,
      orderId: orderConsumed.id,
      buyerCpf: '22233344455',
      holderName: 'Demo Buyer Consumed',
      status: 'CONSUMED',
      hmacSignature: 'secret_consumed_123',
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      price: pastBatch.price,
    },
  });
  await prisma.checkin.create({
    data: {
      eventId: pastEvent.id,
      ticketId: ticketConsumed.id,
      status: 'ACCEPTED',
    },
  });

  console.log('\n✅ Novo Seed Concluído com Sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
