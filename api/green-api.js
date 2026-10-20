import { forwardGreenApi } from '../server/green-api-proxy.js';

async function proxy(request) {
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE';
  const result = await forwardGreenApi({
    method: request.method,
    requestUrl: request.url,
    body: hasBody ? await request.text() : undefined,
  });
  const headers = new Headers({ 'cache-control': 'no-store' });

  if (result.contentType) headers.set('content-type', result.contentType);

  return new Response(result.body, { status: result.status, headers });
}

export function GET(request) {
  return proxy(request);
}

export function POST(request) {
  return proxy(request);
}

export function DELETE(request) {
  return proxy(request);
}
