import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LegacyTicketTypesRedirect() {
  const router = useRouter();
  const { eventId } = router.query;

  useEffect(() => {
    if (eventId) {
      router.replace(`/events/${eventId}/tickets`);
    }
  }, [eventId]);

  return (
    <div className="p-12 text-center text-neutral-550 flex flex-col items-center space-y-3">
      <svg className="animate-spin h-8 w-8 text-[#FF3200]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-sm">Redirecionando para Ingressos...</span>
    </div>
  );
}
