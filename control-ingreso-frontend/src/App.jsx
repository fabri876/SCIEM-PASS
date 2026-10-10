import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { obtenerToken, obtenerUsuarioActual, obtenerRutaPorRol, registrarActividad, estaSesionExpirada, cerrarSesion } from "./services/authService";

// Páginas comunes
import RegistroPage from "./pages/RegistroPage";
import LoginPage from "./pages/LoginPage";
import RegistroExamenPage from "./pages/RegistroExamenPage";
import HomePage from "./pages/HomePage";
import PaginaEnConstruccion from "./pages/PaginaEnConstruccion";

// Páginas de Exámenes (próximos y pasados)
import Examenes from "./pages/examenesHome/Examenes";
import ExamenesPasados from "./pages/examenesHome/ExamenesPasados";

// Páginas de Administrador
import AdminDashboard from "./pages/admin/AdminDashboard";

// Páginas de Docente
import HomeDocente from "./pages/docente/HomeDocente";
import GestionHabilitaciones from "./pages/docente/GestionHabilitaciones";
import ControlIngresoDocente from "./pages/control/ingreso/ControlIngresoDocente";
import OperadorProvider from "./pages/control/OperadorProvider";

// Páginas de Estudiante
import HomeEstudiante from "./pages/estudiante/HomeEstudiante";

// Páginas de Personal de Control (Operador)
import HomeControl from "./pages/control/HomeControl";
import ConectadoOperador from "./pages/control/conectado/ConectadoOperador";
import OffLineOperador from "./pages/control/offline/OffLineOperador";
import ForzarSincronizacionOperador from "./pages/control/forzar/ForzarSincronizacionOperador";

/**
 * Componente Guard para Rutas Públicas (Login / Registro).
 * Si el usuario ya está autenticado y tiene sesión activa, lo redirige
 * automáticamente a su panel según su rol, evitando que vuelva al Login al dar "Atrás".
 */
function RutaPublica({ children }) {
  const token = obtenerToken();
  const usuario = obtenerUsuarioActual();

  if (token && usuario) {
    const strRutaDestino = obtenerRutaPorRol(usuario.rol);
    return <Navigate to={strRutaDestino} replace />;
  }

  return children;
}

/**
 * Componente Guard para Rutas Protegidas según Rol.
 * Si no está autenticado o la sesión expiró (30 min de inactividad), lo redirige al Login.
 * Si el rol no coincide con el permitido, lo redirige a su home correspondiente.
 */
function RutaProtegida({ children, listRolesPermitidos }) {
  const token = obtenerToken();
  const usuario = obtenerUsuarioActual();

  if (!token || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (listRolesPermitidos && listRolesPermitidos.length > 0 && !listRolesPermitidos.includes(usuario.rol)) {
    const strRutaDestino = obtenerRutaPorRol(usuario.rol);
    return <Navigate to={strRutaDestino} replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    const manejarActividad = () => {
      if (localStorage.getItem("token")) {
        registrarActividad();
      }
    };

    window.addEventListener("mousemove", manejarActividad);
    window.addEventListener("keydown", manejarActividad);
    window.addEventListener("click", manejarActividad);
    window.addEventListener("scroll", manejarActividad);

    const intervaloVerificacion = setInterval(() => {
      if (estaSesionExpirada() && localStorage.getItem("token")) {
        cerrarSesion();
        // TC-211/TC-215 (QA): antes no se guardaba este mensaje acá, solo en
        // los servicios que reaccionan a un 401 — por eso nunca se veía
        // "Sesión expirada" al cerrar sesión por inactividad.
        sessionStorage.setItem(
          "mensajeSesion",
          "Sesión expirada. Por favor, inicia sesión nuevamente."
        );
        window.location.href = "/login";
      }
    }, 30000); // Revisa cada 30 segundos si expiro la sesión por inactividad

    return () => {
      window.removeEventListener("mousemove", manejarActividad);
      window.removeEventListener("keydown", manejarActividad);
      window.removeEventListener("click", manejarActividad);
      window.removeEventListener("scroll", manejarActividad);
      clearInterval(intervaloVerificacion);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas (Redirigen al Home si el usuario ya inició sesión) */}
        <Route
          path="/registro"
          element={
            <RutaPublica>
              <RegistroPage />
            </RutaPublica>
          }
        />
        <Route
          path="/login"
          element={
            <RutaPublica>
              <LoginPage />
            </RutaPublica>
          }
        />
        <Route path="/registro-examen" element={<RegistroExamenPage />} />

        {/* Home público: la puerta de entrada del sistema, visible haya
            o no sesión iniciada. Los apartados "Noticias" y "Aulas" ya no
            existen en el Header. Exámenes ya tiene sus pantallas; solo
            Notificaciones va a una página en blanco por ahora. */}
        <Route path="/inicio" element={<HomePage />} />
        <Route path="/examenes" element={<Examenes />} />
        <Route path="/examenes/pasados" element={<ExamenesPasados />} />
        <Route path="/notificaciones" element={<PaginaEnConstruccion />} />

        {/* Ruta de Administrador */}
        <Route
          path="/admin"
          element={
            <RutaProtegida listRolesPermitidos={["ADMINISTRADOR"]}>
              <AdminDashboard />
            </RutaProtegida>
          }
        />

        {/* Rutas del Docente */}
        <Route
          path="/home/docente"
          element={
            <RutaProtegida listRolesPermitidos={["DOCENTE"]}>
              <HomeDocente />
            </RutaProtegida>
          }
        />
        <Route path="/docente" element={<Navigate to="/home/docente" replace />} />
        <Route
          path="/home/docente/examenes/:idExamen/habilitaciones"
          element={
            <RutaProtegida listRolesPermitidos={["DOCENTE"]}>
              <GestionHabilitaciones />
            </RutaProtegida>
          }
        />
        <Route
          path="/home/docente/examenes/:idExamen/control-ingreso"
          element={
            <RutaProtegida listRolesPermitidos={["DOCENTE"]}>
              <OperadorProvider>
                <ControlIngresoDocente />
              </OperadorProvider>
            </RutaProtegida>
          }
        />

        {/* Rutas del Estudiante */}
        <Route
          path="/estudiante"
          element={
            <RutaProtegida listRolesPermitidos={["ESTUDIANTE"]}>
              <HomeEstudiante />
            </RutaProtegida>
          }
        />
        <Route path="/home/estudiante" element={<Navigate to="/estudiante" replace />} />

        {/* Rutas del Personal de Control (Operador) */}
        <Route
          path="/control"
          element={
            <RutaProtegida listRolesPermitidos={["OPERADOR"]}>
              <HomeControl />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="conectado" replace />} />
          <Route path="conectado" element={<ConectadoOperador />} />
          <Route path="offline" element={<OffLineOperador />} />
          <Route path="forzar" element={<ForzarSincronizacionOperador />} />
        </Route>
        <Route path="/home/control" element={<Navigate to="/control" replace />} />

        {/* Redirección por defecto: ahora entra directo al Home */}
        <Route path="/" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
