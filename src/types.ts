export type Credentials = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export type TextMessage = {
  id: string;
  text: string;
  direction: 'in' | 'out';
  timestamp: number;
};

export type Chat = {
  id: string;
  chatId: string;
  phone: string;
  title: string;
  messages: TextMessage[];
};

export type IncomingText = {
  idMessage: string;
  chatId: string;
  phone: string;
  senderName: string;
  text: string;
  timestamp: number;
};

export type CheckedAccount = {
  chatId: string;
  phone: string;
  username: string;
};
