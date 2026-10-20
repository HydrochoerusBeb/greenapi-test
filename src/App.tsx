import { useState } from 'react';
import { ChatScreen } from './components/ChatScreen';
import { LoginScreen } from './components/LoginScreen';
import { clearCredentials, loadCredentials } from './lib/session';
import type { Credentials } from './types';

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() => loadCredentials());

  if (!credentials) {
    return <LoginScreen onSuccess={setCredentials} />;
  }

  return (
    <ChatScreen
      credentials={credentials}
      onLogout={() => {
        clearCredentials();
        setCredentials(null);
      }}
    />
  );
}
