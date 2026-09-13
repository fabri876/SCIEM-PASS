import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Páginas comunes
import RegistroPage from "./pages/RegistroPage";
import LoginPage from "./pages/LoginPage";
import RegistroExamenPage from "./pages/RegistroExamenPage";

// Páginas de Administrador
import AdminDashboard from "./pages/admin/AdminDashboard";

// Páginas de Docente
import HomeDocente from "./pages/docente/HomeDocente";
import GestionHabilitaciones from "./pages/docente/GestionHabilitaciones";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro-examen" element={<RegistroExamenPage />} />

        {/* Ruta de Administrador */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Rutas del Docente */}
        <Route path="/home/docente" element={<HomeDocente />} />
        <Route path="/home/docente/examenes/:idExamen/habilitaciones" element={<GestionHabilitaciones />} />

        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;