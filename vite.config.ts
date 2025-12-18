import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      }
    },
    rollupOptions: {
      output: {
        // Improved code splitting por modulo
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          // UI libraries
          if (id.includes('lucide-react') ||
              id.includes('clsx') ||
              id.includes('react-hot-toast')) {
            return 'vendor-ui';
          }
          // State management
          if (id.includes('zustand')) {
            return 'vendor-state';
          }
          // Utilities
          if (id.includes('uuid') || id.includes('date-fns')) {
            return 'vendor-utils';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 500,
    target: 'es2020',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'clsx']
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '5.0.0')
  },
  preview: {
    port: 4173,
    host: true
  },
  esbuild: {
    legalComments: 'none',
  }
})
