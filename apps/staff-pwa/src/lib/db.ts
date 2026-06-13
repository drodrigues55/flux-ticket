import Dexie, { Table } from 'dexie';

export interface ValidTicket {
  ticket_id: string;
  hmacSignature: string;
}

export interface MutationRecord {
  ticket_id: string;
  timestamp: number;
  status: 'PENDING_SYNC' | 'SYNCED';
}

export class StaffDatabase extends Dexie {
  validTickets!: Table<ValidTicket, string>;
  mutationQueue!: Table<MutationRecord, string>;

  constructor() {
    super('StaffDB');
    this.version(1).stores({
      validTickets: 'ticket_id, hmacSignature',
      mutationQueue: 'ticket_id, timestamp, status',
    });
  }
}

export const db = new StaffDatabase();
export default db;
