import { useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { CheckoutPanel } from './components/CheckoutPanel';
import { GatewaySetupPanel } from './components/GatewaySetupPanel';
import { Layout, Section } from './components/Layout';
import { OrdersPanel } from './components/OrdersPanel';
import { WalletPanel } from './components/WalletPanel';
import { WebhooksPanel } from './components/WebhooksPanel';
import { WithdrawalsPanel } from './components/WithdrawalsPanel';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated } = useAuth();
  const [section, setSection] = useState<Section>('gateway');

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <Layout section={section} onNavigate={setSection}>
      {section === 'gateway' && <GatewaySetupPanel />}
      {section === 'checkout' && <CheckoutPanel />}
      {section === 'orders' && <OrdersPanel />}
      {section === 'wallet' && <WalletPanel />}
      {section === 'withdrawals' && <WithdrawalsPanel />}
      {section === 'webhooks' && <WebhooksPanel />}
    </Layout>
  );
}
