import axios from 'axios';
import { useEffect, useRef } from 'react';
import type { Credentials, IncomingText } from '../../types';
import { deleteNotification, readError, readIncomingText, receiveNotification } from '../api';

type StreamHandlers = {
  onText: (message: IncomingText) => void;
  onError: (message: string) => void;
  onIdle: () => void;
};

export function useNotificationStream(credentials: Credentials, handlers: StreamHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      while (active) {
        try {
          const started = Date.now();
          const notification = await receiveNotification(credentials, controller.signal);
          if (!active) return;
          if (!notification) {
            handlersRef.current.onIdle();
            const pause = 1000 - (Date.now() - started);
            if (pause > 0) await wait(pause, controller.signal);
            continue;
          }

          const text = readIncomingText(notification);
          await deleteNotification(credentials, notification.receiptId, controller.signal);
          if (!active) return;
          if (text) handlersRef.current.onText(text);
          handlersRef.current.onIdle();
        } catch (error) {
          if (!active || axios.isCancel(error)) return;
          handlersRef.current.onError(readError(error));
          await wait(3000, controller.signal).catch(() => undefined);
        }
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [credentials]);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new axios.CanceledError());

  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new axios.CanceledError());
      },
      { once: true },
    );
  });
}
