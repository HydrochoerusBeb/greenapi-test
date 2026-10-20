import { useState, type FormEvent } from 'react';
import type { Credentials } from '../types';
import { parseApiUrl, suggestApiUrl } from '../lib/phone';
import { saveCredentials } from '../lib/session';

type LoginScreenProps = {
  onSuccess: (credentials: Credentials) => void;
};

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiUrlTouched, setApiUrlTouched] = useState(false);
  const [error, setError] = useState('');

  const handleIdChange = (value: string) => {
    setIdInstance(value);
    if (!apiUrlTouched) setApiUrl(suggestApiUrl(value));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const id = idInstance.trim();
    const token = apiTokenInstance.trim();
    const host = parseApiUrl(apiUrl);

    if (!/^\d+$/.test(id)) {
      setError('idInstance должен состоять из цифр');
      return;
    }

    if (!token) {
      setError('Введите apiTokenInstance');
      return;
    }

    if (!host) {
      setError('Укажите apiUrl из кабинета GREEN-API');
      return;
    }

    const credentials = { idInstance: id, apiTokenInstance: token, apiUrl: host };
    saveCredentials(credentials);
    onSuccess(credentials);
  };

  return (
    <main className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="logo" aria-hidden="true">
          <span />
        </div>
        <h1>Вход в чат</h1>
        <p>Данные инстанса GREEN-API для Telegram</p>

        <label>
          idInstance
          <input
            value={idInstance}
            onChange={(event) => handleIdChange(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </label>

        <label>
          apiTokenInstance
          <input
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            type="password"
            autoComplete="off"
            required
          />
        </label>

        <label>
          apiUrl
          <input
            value={apiUrl}
            onChange={(event) => {
              setApiUrlTouched(true);
              setApiUrl(event.target.value);
            }}
            placeholder="https://1100.api.green-api.com"
            inputMode="url"
            autoComplete="off"
            required
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit">Войти</button>
      </form>
    </main>
  );
}
