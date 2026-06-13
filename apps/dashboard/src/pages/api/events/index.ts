import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

/**
 * Função utilitária para gerar um JWT simulado em memória (formato header.payload.signature)
 * sem a necessidade de pacotes externos pesados de criptografia.
 */
function generateMockJWT(userId: string, role: string): string {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = { userId, role };
  
  const toBase64Url = (obj: object) => 
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = toBase64Url(header);
  const encodedPayload = toBase64Url(payload);
  
  return `${encodedHeader}.${encodedPayload}.mocksignature`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Garantir que exista um organizador de testes no banco
    let organizer = await prisma.user.findFirst({
      where: { role: 'ORGANIZER' },
    });

    if (!organizer) {
      organizer = await prisma.user.create({
        data: {
          email: 'mock-organizer@flux.com',
          name: 'Mock Organizer',
          password: 'password123',
          role: 'ORGANIZER',
        },
      });
    }

    // 2. Gerar o token JWT correspondente para que o Guard do NestJS valide com sucesso
    const mockToken = generateMockJWT(organizer.id, 'ORGANIZER');

    const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`,
      },
    };

    if (req.method === 'POST') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // 3. Fazer a requisição para o NestJS backend
    const response = await fetch(`${apiWriteUrl}/events`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Falha ao encaminhar eventos:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar proxy de eventos.' });
  }
}
