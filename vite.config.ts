import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

const greenApiProxy: ProxyOptions = {
  target: 'https://api.green-api.com',
  changeOrigin: true,
  timeout: 70000,
  proxyTimeout: 70000,
  router(req) {
    const host = req.url?.split('/')[3] ?? '';
    if (!/^[\w.-]+\.green-api\.com$/.test(host)) return 'https://api.green-api.com';
    return `https://${host}`;
  },
  rewrite: (path) => path.replace(/^\/api\/green-api\/[^/]+/, ''),
  configure(proxy) {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.removeHeader('origin');
    });
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/green-api': greenApiProxy,
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/api/green-api': greenApiProxy,
    },
  },
});
