import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD) {
  const registrar = () =>
    import('./offline/swRegister.js')
      .then(({ registrarSW }) => registrarSW())
      .catch((e) => console.error('[SW] No se pudo cargar el registro:', e));

  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });
}
