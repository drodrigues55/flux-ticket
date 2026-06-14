import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';
import * as crypto from 'crypto';

// Pure JS ZIP compiler using standard buffer formatting
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    let code = (crc ^ byte) & 0xff;
    for (let j = 0; j < 8; j++) {
      if ((code & 1) === 1) {
        code = (code >>> 1) ^ 0xedb88320;
      } else {
        code = code >>> 1;
      }
    }
    crc = (crc >>> 8) ^ code;
  }
  return (~crc) >>> 0;
}

function createMiniZip(files: { name: string; content: string }[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const data = Buffer.from(file.content);
    const nameBuf = Buffer.from(file.name);
    const crc = crc32(data);

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(10, 4); // Version
    localHeader.writeUInt16LE(0, 6); // Flag
    localHeader.writeUInt16LE(0, 8); // Compression method (Store)
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14); // CRC
    localHeader.writeUInt32LE(data.length, 18); // Compressed size
    localHeader.writeUInt32LE(data.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, data);

    // Central directory file header
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(10, 6); // Version needed
    centralHeader.writeUInt16LE(0, 8); // Flag
    centralHeader.writeUInt16LE(0, 10); // Compression method
    centralHeader.writeUInt16LE(0, 12); // Mod time
    centralHeader.writeUInt16LE(0, 14); // Mod date
    centralHeader.writeUInt32LE(crc, 16); // CRC
    centralHeader.writeUInt32LE(data.length, 20); // Compressed size
    centralHeader.writeUInt32LE(data.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30); // Extra length
    centralHeader.writeUInt16LE(0, 32); // Comment length
    centralHeader.writeUInt16LE(0, 34); // Disk
    centralHeader.writeUInt16LE(0, 36); // Internal attrs
    centralHeader.writeUInt32LE(0, 38); // External attrs
    centralHeader.writeUInt32LE(offset, 42); // Offset of local header
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const localSize = localHeaders.reduce((acc, b) => acc + b.length, 0);
  const centralSize = centralHeaders.reduce((acc, b) => acc + b.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD Signature
  eocd.writeUInt16LE(0, 4); // Disk
  eocd.writeUInt16LE(0, 6); // Start disk
  eocd.writeUInt16LE(files.length, 8); // Disk entries
  eocd.writeUInt16LE(files.length, 10); // Total entries
  eocd.writeUInt32LE(centralSize, 12); // Central size
  eocd.writeUInt32LE(localSize, 16); // Central offset
  eocd.writeUInt16LE(0, 20); // Comment len

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketId } = req.query;

  if (!ticketId || typeof ticketId !== 'string') {
    return res.status(400).json({ error: 'ticketId is required' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        batch: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Pass configuration JSON data
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: "pass.com.flux.tickets",
      serialNumber: ticket.id,
      teamIdentifier: "FLUX123456",
      webServiceURL: "https://flux-tickets.com/api/wallets",
      authenticationToken: "auth-token-123456",
      barcode: {
        message: ticket.id,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1"
      },
      organizationName: "Flux Tickets",
      description: `Ingresso para ${ticket.batch.event.title}`,
      logoText: "Flux Tickets",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(98, 0, 238)",
      eventTicket: {
        primaryFields: [
          {
            key: "event",
            label: "EVENTO",
            value: ticket.batch.event.title
          }
        ],
        secondaryFields: [
          {
            key: "loc",
            label: "LOCAL",
            value: ticket.batch.event.location
          }
        ],
        auxiliaryFields: [
          {
            key: "date",
            label: "DATA DO SHOW",
            value: ticket.batch.event.date.toISOString()
          },
          {
            key: "sector",
            label: "SETOR",
            value: ticket.batch.name
          }
        ]
      }
    };

    const passJsonContent = JSON.stringify(passJson, null, 2);
    
    // Hash details for manifest
    const manifest = {
      "pass.json": crypto.createHash('sha1').update(passJsonContent).digest('hex'),
    };
    const manifestContent = JSON.stringify(manifest, null, 2);

    const zipBuffer = createMiniZip([
      { name: 'pass.json', content: passJsonContent },
      { name: 'manifest.json', content: manifestContent }
    ]);

    // Set Apple Wallet Content-Type headers for download
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId}.pkpass"`);
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    return res.status(200).send(zipBuffer);
  } catch (error: any) {
    console.error('[PKPASS API ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error compiling pkpass' });
  }
}
