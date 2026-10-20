const HOST_PATTERN = /^[\w.-]+\.green-api\.com$/;
const PATH_PATTERN = /^waInstance\d+\/[A-Za-z]+\/[A-Za-z0-9]+(?:\/\d+)?$/;

export function greenApiTarget(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  const host = url.searchParams.get('host') ?? '';
  const path = url.searchParams.get('path') ?? '';

  if (!HOST_PATTERN.test(host) || !PATH_PATTERN.test(path)) {
    return { error: 'Некорректный apiUrl' };
  }

  url.searchParams.delete('host');
  url.searchParams.delete('path');
  const search = url.searchParams.toString();

  return { target: `https://${host}/${path}${search ? `?${search}` : ''}` };
}

export async function forwardGreenApi({ method, requestUrl, body }) {
  const parsed = greenApiTarget(requestUrl);

  if (parsed.error) {
    return {
      status: 400,
      body: JSON.stringify({ message: parsed.error }),
      contentType: 'application/json',
    };
  }

  const hasBody = body != null && method !== 'GET' && method !== 'HEAD' && method !== 'DELETE';

  try {
    const upstream = await fetch(parsed.target, {
      method,
      headers: {
        accept: 'application/json',
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
      },
      body: hasBody ? body : undefined,
      signal: AbortSignal.timeout(55000),
    });
    const text = await upstream.text();

    return {
      status: upstream.status,
      body: text,
      contentType: upstream.headers.get('content-type') || '',
    };
  } catch {
    return {
      status: 502,
      body: JSON.stringify({ message: 'Нет связи с GREEN-API' }),
      contentType: 'application/json',
    };
  }
}
