import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
  build: {
    // Disable source maps in production for maximum security & minimal payload
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
    cssCodeSplit: true,
    cssMinify: true,
    // Industry-standard warning threshold (500KB)
    chunkSizeWarningLimit: 500,
    // Report real-world gzip sizes in the build output
    reportCompressedSize: true,
    // Inline assets smaller than 4KB as base64 (fewer HTTP requests)
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-motion': ['framer-motion'],
          // Split icon libraries into separate chunks for better CDN caching
          'vendor-lucide': ['lucide-react'],
          'vendor-react-icons': ['react-icons'],
          'vendor-socket': ['socket.io-client'],
          'vendor-chart': ['recharts'],
          'vendor-utils': ['date-fns', 'zustand', 'react-helmet-async'],
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
