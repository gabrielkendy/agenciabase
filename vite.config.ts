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
        drop_console: true, // Remove console.log em producao
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Code splitting por vendor
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['lucide-react', 'clsx', 'react-hot-toast', 'zustand'],
          // Utilities
          'vendor-utils': ['uuid', 'date-fns'],
        },
        // Nomes de arquivos com hash para cache
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Aumentar limite de warning (mas ainda mostra)
    chunkSizeWarningLimit: 600
  },
  // Otimizacoes de performance
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand']
  },
  // Define para producao
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '5.0.0')
  }
})
