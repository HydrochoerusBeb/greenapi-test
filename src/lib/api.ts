import axios from 'axios';
import type { CheckedAccount, Credentials, IncomingText } from '../types';

const RECEIVE_TIMEOUT_SEC = 20;

type NotificationBody = {
  typeWebhook?: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId?: string;
    chatName?: string;
    senderName?: string;
    senderPhoneNumber?: number;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: {
      textMessage?: string;
    };
  };
};

type NotificationResponse = {
  receiptId: number;
  body?: NotificationBody;
};

type CheckAccountResponse = {
  exist?: boolean;
  chatId?: string;
  username?: string;
  status?: boolean;
  reason?: string;
};

export function readError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) return data.trim();

    if (data && typeof data === 'object') {
      if ('reason' in data && data.reason) return String(data.reason);
      if ('message' in data && data.message) return String(data.message);
    }

    if (error.code === 'ERR_NETWORK') return 'Нет связи с GREEN-API';
    if (error.response?.status) return `Ошибка ${error.response.status}`;
    return 'Нет ответа от GREEN-API';
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Не удалось выполнить запрос';
}

function endpoint(credentials: Credentials, method: string, tail = ''): string {
  const id = encodeURIComponent(credentials.idInstance);
  const token = encodeURIComponent(credentials.apiTokenInstance);
  const host = new URL(credentials.apiUrl).host;
  const params = new URLSearchParams({
    host,
    path: `waInstance${id}/${method}/${token}${tail}`,
  });

  return `/api/green-api?${params}`;
}

export async function sendTextMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<string> {
  const { data } = await axios.post<{ idMessage?: string }>(
    endpoint(credentials, 'sendMessage'),
    { chatId, message },
    { timeout: 15000 },
  );

  if (!data?.idMessage) {
    throw new Error('GREEN-API не вернул идентификатор сообщения');
  }

  return data.idMessage;
}

export async function checkAccount(
  credentials: Credentials,
  phone: string,
): Promise<CheckedAccount> {
  const phoneNumber = Number(phone);

  const { data } = await axios.post<CheckAccountResponse>(
    endpoint(credentials, 'checkAccount'),
    { phoneNumber },
    { timeout: 15000 },
  );

  if (data?.status === false) {
    throw new Error(accountFailure(data.reason));
  }

  if (!data?.exist || !data.chatId) {
    throw new Error('В Telegram нет аккаунта с этим номером');
  }

  return {
    chatId: data.chatId,
    phone,
    username: data.username ?? '',
  };
}

export async function receiveNotification(
  credentials: Credentials,
  signal: AbortSignal,
): Promise<NotificationResponse | null> {
  const { data } = await axios.get<NotificationResponse | null>(
    endpoint(credentials, 'receiveNotification'),
    {
      params: { receiveTimeout: RECEIVE_TIMEOUT_SEC },
      timeout: RECEIVE_TIMEOUT_SEC * 1000 + 5000,
      signal,
    },
  );

  if (!data || data.receiptId == null) return null;
  return data;
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal: AbortSignal,
): Promise<void> {
  await axios.delete(endpoint(credentials, 'deleteNotification', `/${receiptId}`), {
    timeout: 15000,
    signal,
  });
}

export function readIncomingText(notification: NotificationResponse): IncomingText | null {
  const body = notification.body;
  if (body?.typeWebhook !== 'incomingMessageReceived') return null;
  if (body.messageData?.typeMessage !== 'textMessage') return null;

  const text = body.messageData.textMessageData?.textMessage?.trim();
  const chatId = body.senderData?.chatId;
  const idMessage = body.idMessage;
  if (!text || !chatId || !idMessage) return null;

  const phoneNumber = body.senderData?.senderPhoneNumber;

  return {
    idMessage,
    chatId,
    phone: phoneNumber ? String(phoneNumber) : '',
    senderName: body.senderData?.senderName || body.senderData?.chatName || '',
    text,
    timestamp: toMillis(body.timestamp),
  };
}

function accountFailure(reason: string | undefined): string {
  if (reason === 'instance is starting or not authorized') {
    return 'Инстанс не авторизован или ещё запускается';
  }

  if (reason === 'rate_limit_exceeded' || reason === 'Rate limited by messenger') {
    return 'Слишком много проверок номера. Попробуйте позже';
  }

  return reason || 'Не удалось проверить номер';
}

function toMillis(timestamp: number | undefined): number {
  if (!timestamp) return Date.now();
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}
