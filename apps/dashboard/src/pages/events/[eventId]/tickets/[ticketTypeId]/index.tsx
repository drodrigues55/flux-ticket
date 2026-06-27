import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TicketTypeIdIndex() {
  const router = useRouter();
  const { eventId, ticketTypeId } = router.query;

  useEffect(() => {
    if (eventId && ticketTypeId) {
      router.replace(`/events/${eventId}/tickets/${ticketTypeId}/information`);
    }
  }, [eventId, ticketTypeId]);

  return <div className="p-8 text-sm text-neutral-500">Redirecionando para informações do ingresso...</div>;
}
