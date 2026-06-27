import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PublishingRedirectPage() {
  const router = useRouter();
  const { eventId } = router.query;

  useEffect(() => {
    if (eventId) {
      router.replace(`/events/${eventId}/publishing/checklist`);
    }
  }, [eventId]);

  return <div className="p-8 text-neutral-500 text-sm">Redirecionando...</div>;
}
