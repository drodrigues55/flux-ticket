import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data backfill: Creating default TicketTypes for existing Events...');
  
  const events = await prisma.event.findMany({
    include: {
      batches: true,
      ticketTypes: true
    }
  });

  for (const event of events) {
    if (event.ticketTypes.length > 0) {
      console.log(`Event ${event.id} already has TicketTypes. Skipping.`);
      continue;
    }

    // Determine default capacity from batches if event doesn't have target capacity
    const defaultCapacity = event.capacityTarget 
      ? event.capacityTarget 
      : event.batches.reduce((acc, batch) => acc + batch.totalQuantity, 0) || 1000;

    // Create a default TicketType
    const defaultTicketType = await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: 'General Admission',
        description: 'Default ticket type created during migration',
        capacity: defaultCapacity,
        visibility: true,
        transferable: true,
        refundable: true,
        purchaseLimit: 5,
        isActive: true,
      }
    });

    console.log(`Created default TicketType ${defaultTicketType.id} for Event ${event.id}`);

    // Link existing batches to this TicketType
    if (event.batches.length > 0) {
      const batchIds = event.batches.map(b => b.id);
      await prisma.ticketBatch.updateMany({
        where: { id: { in: batchIds } },
        data: { ticketTypeId: defaultTicketType.id }
      });
      console.log(`Linked ${batchIds.length} batches to TicketType ${defaultTicketType.id}`);
    }
  }

  console.log('Backfill completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
