import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/ws-stomp': {
          target: 'http://localhost:8080',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), tailwindcss()],
    define: {
      global: 'window',
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    },
    esbuild: {
      // 프로덕션 빌드에서 console.log/info/warn/debug 제거 (console.error는 유지)
      pure: isProd
        ? ['console.log', 'console.info', 'console.warn', 'console.debug', 'console.trace']
        : [],
      drop: isProd ? ['debugger'] : [],
    },
  };
});
