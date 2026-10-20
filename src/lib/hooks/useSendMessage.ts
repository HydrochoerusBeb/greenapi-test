import { useCallback, useState } from 'react';
import type { Credentials } from '../../types';
import { sendTextMessage } from '../api';

export function useSendMessage(credentials: Credentials) {
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(
    async (chatId: string, message: string): Promise<string> => {
      setIsSending(true);

      try {
        return await sendTextMessage(credentials, chatId, message);
      } finally {
        setIsSending(false);
      }
    },
    [credentials],
  );

  return { sendMessage, isSending };
}
