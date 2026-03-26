// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  server: {
    proxy: {
      '/api': {
        target: JSON.stringify(process.env.NODE_ENV) ? 'http://localhost:4000' : 'https://share.jewellerskart.com/amjay-api-server',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@api': path.resolve(__dirname, './src/api'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@types': path.resolve(__dirname, './@types'),
      '@common': path.resolve(__dirname, './src/components/common'),
      '@variable': path.resolve(__dirname, './src/variables.ts'),
      'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime',
      'react/jsx-runtime.js': 'react/jsx-runtime',
    },
  },
});
