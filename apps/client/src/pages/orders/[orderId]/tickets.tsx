import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OrderTicketsRedirectPage() {
  const router = useRouter();
  const { orderId } = router.query;

  useEffect(() => {
    if (orderId) {
      router.replace(`/orders/${orderId}/confirmation`);
    }
  }, [orderId]);

  return <div className="p-8 text-neutral-500 text-sm">Redirecionando...</div>;
}
