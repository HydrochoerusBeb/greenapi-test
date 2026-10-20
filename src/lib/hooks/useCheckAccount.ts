import { useCallback, useState } from 'react';
import type { CheckedAccount, Credentials } from '../../types';
import { checkAccount } from '../api';

export function useCheckAccount(credentials: Credentials) {
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(
    async (phone: string): Promise<CheckedAccount> => {
      setIsChecking(true);

      try {
        return await checkAccount(credentials, phone);
      } finally {
        setIsChecking(false);
      }
    },
    [credentials],
  );

  return { check, isChecking };
}
