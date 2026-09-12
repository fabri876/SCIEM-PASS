import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RegistroPage from "./pages/RegistroPage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* "/" no tenía pantalla asignada todavía: la mandé a /registro
            para que la app no quede en blanco al abrirla. Cambialo a
            donde corresponda (ej. /login, o un futuro Dashboard) apenas
            el equipo lo defina. */}
        <Route path="/" element={<Navigate to="/registro" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
