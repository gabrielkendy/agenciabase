import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { autoInitializeAPIs } from './services/apiInitializer'

// Auto-inicializar todas as APIs com chaves salvas
autoInitializeAPIs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
