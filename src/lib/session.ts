import type { Chat, Credentials } from '../types';

const CREDENTIALS_KEY = 'green-api-credentials';

function chatsKey(idInstance: string): string {
  return `green-api-chats:${idInstance}`;
}

export function loadCredentials(): Credentials | null {
  const raw = read(CREDENTIALS_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Credentials;
    if (!value.idInstance || !value.apiTokenInstance || !value.apiUrl) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: Credentials): void {
  write(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function clearCredentials(): void {
  sessionStorage.removeItem(CREDENTIALS_KEY);
}

export function loadChats(idInstance: string): Chat[] {
  const raw = read(chatsKey(idInstance));
  if (!raw) return [];

  try {
    const value = JSON.parse(raw) as Chat[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveChats(idInstance: string, chats: Chat[]): void {
  write(chatsKey(idInstance), JSON.stringify(chats));
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Session storage can be unavailable. The chat still works until reload.
  }
}
