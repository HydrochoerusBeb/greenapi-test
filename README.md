# Чат для Telegram через GREEN-API

Текстовый чат на React. Вводишь данные инстанса, создаёшь диалог по номеру и переписываешься.

Демо: https://greenapi-test-taupe.vercel.app/

## Запуск

Нужен Node.js.

```bash
npm install
npm run dev
```

Открыть http://localhost:3000

`idInstance`, `apiTokenInstance` и `apiUrl` берутся в кабинете GREEN-API. Инстанс должен быть Telegram и уже авторизован. Чтобы ответы появлялись в чате, webhook URL оставляете пустым и включаете входящие уведомления.
