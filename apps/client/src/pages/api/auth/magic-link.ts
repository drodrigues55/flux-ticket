import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

// Global store for OTP codes during development
const otps = (global as any).otps || {};
(global as any).otps = otps;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, code } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // 1. Action: SEND OTP
  if (action === 'send') {
    // Generate a random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save in our global memory store
    otps[cleanEmail] = {
      code: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiration
    };

    // Print to server console for testing/verification
    console.log(`\n======================================================`);
    console.log(`[MAGIC OTP] Código para o e-mail: ${cleanEmail}`);
    console.log(`🔑 CÓDIGO DE ACESSO: ${otpCode}`);
    console.log(`======================================================\n`);

    return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  }

  // 2. Action: VERIFY OTP
  if (action === 'verify') {
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required' });
    }

    const storedOtp = otps[cleanEmail];

    if (!storedOtp) {
      return res.status(400).json({ error: 'Nenhum código gerado para este e-mail.' });
    }

    if (Date.now() > storedOtp.expiresAt) {
      delete otps[cleanEmail];
      return res.status(400).json({ error: 'Código de acesso expirou.' });
    }

    if (storedOtp.code !== code.trim()) {
      return res.status(400).json({ error: 'Código de acesso incorreto.' });
    }

    // OTP validated - remove it from store (single use)
    delete otps[cleanEmail];

    // Find the user in the database
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // If the user doesn't exist, we can create one on the fly to support logins for clean databases
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          password: 'magic-link-placeholder-password',
          role: 'USER',
        },
      });
    }

    return res.status(200).json({
      success: true,
      token: 'mock-session-token-' + Math.random().toString(36).substring(2),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  }

  return res.status(400).json({ error: 'Invalid action. Must be "send" or "verify".' });
}
