const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient({ 
  log: ['query', 'info', 'warn', 'error'], 
  datasources: { 
    db: { url: 'postgresql://flux_user:flux_password@localhost:5432/flux_db?schema=public' } 
  } 
}); 
prisma.$connect().then(() => { 
  console.log('Connected localhost!'); 
  process.exit(0); 
}).catch(e => { 
  console.error('Error:', e); 
  process.exit(1); 
});
