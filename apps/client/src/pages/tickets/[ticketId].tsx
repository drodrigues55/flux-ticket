import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TicketsRedirectPage() {
  const router = useRouter();
  const { ticketId } = router.query;

  useEffect(() => {
    if (ticketId) {
      router.replace(`/ticket/${ticketId}`);
    }
  }, [ticketId]);

  return <div className="p-8 text-neutral-500 text-sm">Redirecionando...</div>;
}
