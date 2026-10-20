const HOST_PATTERN = /^[\w.-]+\.green-api\.com$/;

export default async function handler(req, res) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug : [];
  const [host, ...path] = slug;

  if (!host || !HOST_PATTERN.test(host)) {
    res.status(400).json({ message: 'Некорректный apiUrl' });
    return;
  }

  const search = new URL(req.url, 'http://localhost').search;
  const target = `https://${host}/${path.map(encodeURIComponent).join('/')}${search}`;
  const body = readBody(req);

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      body,
      signal: AbortSignal.timeout(55000),
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type');

    res.status(upstream.status);
    res.setHeader('cache-control', 'no-store');
    if (contentType) res.setHeader('content-type', contentType);
    res.send(text);
  } catch {
    res.status(502).json({ message: 'Нет связи с GREEN-API' });
  }
}

function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') return undefined;
  if (req.body == null || req.body === '') return undefined;
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body);
}
