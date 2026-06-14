import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== SEEDING EVENTS WITH DYNAMIC PRICES ===\n');

  // 1. Limpar dados antigos para evitar duplicidade
  await prisma.ticket.deleteMany({});
  await prisma.ticketBatch.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Garantir organizador
  const user = await prisma.user.create({
    data: {
      id: 'ca2a30e0-1a2e-4a85-b549-19ec34d49080',
      email: 'organizer@flux.com',
      password: 'password123',
      name: 'Organizer User',
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
    prices: { superior: number; vip: number; premium: number }
  ) {
    const event = await prisma.event.create({
      data: { title, description, date: new Date(date), location, categoryId, organizerId },
    });

    const eventBatches = [
      { name: 'PLATEIA SUPERIOR', price: prices.superior, totalQuantity: 300, availableQuantity: 300, sectorId: 1, sectorName: 'PLATEIA SUPERIOR' },
      { name: 'PLATEIA VIP',      price: prices.vip, totalQuantity: 200, availableQuantity: 200, sectorId: 2, sectorName: 'PLATEIA VIP' },
      { name: 'PLATEIA PREMIUM',  price: prices.premium, totalQuantity: 150, availableQuantity: 150, sectorId: 3, sectorName: 'PLATEIA PREMIUM' },
    ];

    for (const batch of eventBatches) {
      await prisma.ticketBatch.create({ data: { ...batch, eventId: event.id } });
    }
    console.log(`  ✅ "${title}" cadastrado (Superior: R$ ${prices.superior}, VIP: R$ ${prices.vip}, Premium: R$ ${prices.premium})`);
    return event;
  }

  // 3. Cadastrar Shows (Categoria 1)
  await createEvent(
    'Bee Gees Alive - Anapolis',
    'Bee Gees Alive apresenta show em comemoração aos 25 anos de carreira. Espetáculo faz parte da turnê 2026 e traz novidades para o público.',
    '2026-06-14T20:00:00Z',
    'Teatro São Francisco',
    1,
    { superior: 110.00, vip: 140.00, premium: 160.00 }
  );

  await createEvent(
    'Rock in Rio 2026',
    'O maior festival de música do Brasil de volta com line-up histórico.',
    '2026-10-01T19:00:00Z',
    'Cidade do Rock - Rio de Janeiro RJ',
    1,
    { superior: 220.00, vip: 380.00, premium: 490.00 }
  );

  await createEvent(
    'Coldplay | Music of the Spheres',
    'A turnê mais esperada de 2026 chega ao Brasil com show imersivo e luzes LED.',
    '2026-11-15T20:00:00Z',
    'Allianz Parque - São Paulo SP',
    1,
    { superior: 250.00, vip: 420.00, premium: 580.00 }
  );

  // 4. Cadastrar Teatro (Categoria 2)
  await createEvent(
    'Hamlet - O Musical',
    'Adaptação moderna de Shakespeare com trilha sonora original ao vivo.',
    '2026-08-20T19:30:00Z',
    'Teatro Municipal - São Paulo SP',
    2,
    { superior: 80.00, vip: 120.00, premium: 160.00 }
  );

  await createEvent(
    'Chicago - O Musical',
    'O clássico da Broadway em temporada especial no Brasil.',
    '2026-09-12T20:00:00Z',
    'Teatro Alfa - São Paulo SP',
    2,
    { superior: 90.00, vip: 130.00, premium: 180.00 }
  );

  // 5. Cadastrar Esportes (Categoria 3)
  await createEvent(
    'Final da Copa do Brasil 2026',
    'A grande decisão do campeonato mais emocionante do futebol nacional.',
    '2026-12-06T17:00:00Z',
    'Estádio Mané Garrincha - Brasília DF',
    3,
    { superior: 150.00, vip: 280.00, premium: 450.00 }
  );

  await createEvent(
    'UFC Fight Night Brasil',
    'Os melhores lutadores do mundo se enfrentam em combates eletrizantes.',
    '2026-11-28T18:00:00Z',
    'Arena Carioca 1 - Rio de Janeiro RJ',
    3,
    { superior: 120.00, vip: 220.00, premium: 350.00 }
  );

  // 6. Cadastrar Infantis (Categoria 4)
  await createEvent(
    'Turma da Mônica em Cena',
    'As famosas histórias em quadrinhos ganham vida em um espetáculo musical super divertido.',
    '2026-10-12T15:00:00Z',
    'Teatro das Artes - Rio de Janeiro RJ',
    4,
    { superior: 50.00, vip: 80.00, premium: 110.00 }
  );

  await createEvent(
    'Galinha Pintadinha ao Vivo',
    'Show interativo com músicas, dança e surpresas para toda a família.',
    '2026-07-19T16:00:00Z',
    'Ginásio Nilson Nelson - Brasília DF',
    4,
    { superior: 60.00, vip: 95.00, premium: 130.00 }
  );

  console.log('\n✅ Novo Seed Concluído com Sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
