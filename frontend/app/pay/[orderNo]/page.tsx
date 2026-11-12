'use client';

import { useParams } from 'next/navigation';
import {
  CheckoutShell,
  LoadErrorScreen,
  LoadingScreen,
  StatusBody,
  usePublicOrder,
} from '../checkout-ui';

export default function PayPage() {
  const params = useParams<{ orderNo: string }>();
  const orderNo = params.orderNo;
  const { order, error, reload } = usePublicOrder(orderNo);

  if (error) return <LoadErrorScreen error={error} />;
  if (!order) return <LoadingScreen />;

  return (
    <CheckoutShell order={order}>
      <StatusBody order={order} orderNo={orderNo} onSubmitted={reload} />
    </CheckoutShell>
  );
}
