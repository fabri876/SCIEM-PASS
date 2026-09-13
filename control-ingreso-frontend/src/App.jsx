import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RegistroPage from "./pages/RegistroPage";
import LoginPage from "./pages/LoginPage";
import HomeDocente from "./pages/docente/HomeDocente";
import GestionHabilitaciones from "./pages/docente/GestionHabilitaciones";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/registro" element={<RegistroPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Rutas del Docente */}
                <Route path="/home/docente" element={<HomeDocente />} />
                <Route path="/home/docente/examenes/:idExamen/habilitaciones" element={<GestionHabilitaciones />} />

                {/* Ruta por defecto */}
                <Route path="/" element={<Navigate to="/home/docente" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;