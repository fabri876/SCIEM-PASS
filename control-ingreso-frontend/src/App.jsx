import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RegistroPage from "./pages/RegistroPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Nueva ruta para tu panel de administración */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/registro" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
