import Header from "../components/layout/Header";

/**
 * PaginaEnConstruccion.jsx
 *
 * Placeholder para las rutas del Header que todavía no tienen pantalla
 * propia (Exámenes, Noticias, Aulas, Notificaciones). Mantiene el
 * Header visible para que la navegación no quede en un callejón sin
 * salida — el resto de la pantalla queda en blanco a propósito. Una
 * vez que cada una se implemente, se reemplaza esta entrada en App.jsx
 * por la página real correspondiente.
 */
export default function PaginaEnConstruccion() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
    </div>
  );
}
