import type { Chat, IncomingText, TextMessage } from '../types';
import { formatPhone, samePhone } from './phone';

export function applyIncoming(chats: Chat[], incoming: IncomingText): Chat[] {
  const message = toMessage(incoming);
  const index = chats.findIndex(
    (chat) =>
      chat.chatId === incoming.chatId ||
      chat.id === incoming.chatId ||
      (incoming.phone !== '' && samePhone(chat.phone, incoming.phone)),
  );

  if (index === -1) {
    return [
      {
        id: incoming.chatId,
        chatId: incoming.chatId,
        phone: incoming.phone,
        title: incoming.senderName || formatPhone(incoming.phone) || incoming.chatId,
        messages: [message],
      },
      ...chats,
    ];
  }

  const chat = chats[index];
  if (chat.messages.some((item) => item.id === message.id)) return chats;

  const titledByPhone = chat.title === formatPhone(chat.phone);
  const nextChat: Chat = {
    ...chat,
    chatId: incoming.chatId || chat.chatId,
    phone: chat.phone || incoming.phone,
    title: titledByPhone && incoming.senderName ? incoming.senderName : chat.title,
    messages: [...chat.messages, message],
  };

  return [nextChat, ...chats.filter((item) => item.id !== chat.id)];
}

export function appendOutgoing(chats: Chat[], chatId: string, message: TextMessage): Chat[] {
  const index = chats.findIndex((chat) => chat.id === chatId);
  if (index === -1) return chats;

  const chat = chats[index];
  if (chat.messages.some((item) => item.id === message.id)) return chats;

  const nextChat: Chat = { ...chat, messages: [...chat.messages, message] };
  return [nextChat, ...chats.filter((item) => item.id !== chat.id)];
}

export function lastMessage(chat: Chat): TextMessage | undefined {
  return chat.messages.reduce<TextMessage | undefined>((latest, message) => {
    if (!latest || message.timestamp >= latest.timestamp) return message;
    return latest;
  }, undefined);
}

function toMessage(incoming: IncomingText): TextMessage {
  return {
    id: incoming.idMessage,
    text: incoming.text,
    direction: 'in',
    timestamp: incoming.timestamp,
  };
}
