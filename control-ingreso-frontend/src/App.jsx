import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import HomeDocente from './pages/docente/HomeDocente';
import GestionHabilitaciones from './pages/docente/GestionHabilitaciones';

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          {/* Tu Landing Page original */}
          <Route path="/" element={<LandingPage />} />

          {/* Rutas del Docente */}
          <Route path="/Home/Docente" element={<HomeDocenteWrapper />} />
          <Route path="/Home/Docente/Examenes" element={<HomeDocenteWrapper />} />
          <Route path="/Home/Docente/Examenes/:idExamen" element={<GestionHabilitacionesWrapper />} />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
  );
}

// ---- Wrappers para conectar la navegación por URL con tus componentes ----

function HomeDocenteWrapper() {
  const navigate = useNavigate();
  return (
      <HomeDocente
          onSeleccionarExamen={(idExamen) => navigate(`/Home/Docente/Examenes/${idExamen}`)}
          onVolverHome={() => navigate('/')}
      />
  );
}

function GestionHabilitacionesWrapper() {
  const { idExamen } = useParams();
  const navigate = useNavigate();
  return (
      <GestionHabilitaciones
          examenId={Number(idExamen)}
          onVolver={() => navigate('/Home/Docente')}
      />
  );
}

// ---- Tu Landing Page original intacta, agregando los enlaces en los botones y rol de docente ----

function LandingPage() {
  const navigate = useNavigate();

  return (
      <div className="min-h-screen bg-bg-app">

        {/* ===== NAVBAR ===== */}
        <nav className="flex items-center justify-between px-8 py-5 bg-bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="font-nunito text-card-title font-extrabold text-primary-navy">
            SCIEM-PASS
          </span>
          </div>
          <button
              onClick={() => navigate('/Home/Docente')}
              className="flex items-center gap-2 bg-[image:var(--gradient-button)] text-white font-bold text-secondary py-2.5 px-5 rounded-lg cursor-pointer"
          >
            Iniciar sesión
          </button>
        </nav>

        {/* ===== HERO ===== */}
        <section className="bg-[image:var(--gradient-banner)] text-white px-8 py-20 text-center">
        <span className="text-badge font-bold uppercase tracking-wide text-white/70">
          Control de ingreso a exámenes masivos
        </span>
          <h1 className="font-nunito text-hero font-extrabold mt-4 leading-tight max-w-3xl mx-auto">
            Un proceso <span className="text-accent-red">seguro</span>, rápido y confiable
          </h1>
          <p className="font-nunito text-body mt-5 max-w-xl mx-auto text-white/90">
            Verifica identidad, controla habilitaciones y registra ingresos en
            segundos, incluso durante los picos de mayor demanda.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
                onClick={() => navigate('/Home/Docente')}
                className="bg-[image:var(--gradient-button)] text-white font-bold py-3 px-8 rounded-lg shadow-lg cursor-pointer"
            >
              Iniciar sesión
            </button>
            <button className="bg-white/10 border border-white/30 text-white font-bold py-3 px-8 rounded-lg cursor-pointer">
              Conocer más
            </button>
          </div>
        </section>

        {/* ===== CARACTERÍSTICAS ===== */}
        <section className="px-8 py-16 max-w-5xl mx-auto">
          <h2 className="font-nunito text-h2 font-extrabold text-primary-navy text-center">
            Todo lo que necesitas, en un solo lugar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
            {[
              { emoji: '🛡️', title: 'Identidad verificada', desc: 'CI, código universitario o QR, validados al instante.' },
              { emoji: '⚡', title: 'Registro en tiempo real', desc: 'Ingresos, ausencias y reportes actualizados al segundo.' },
              { emoji: '✅', title: 'Sin duplicados', desc: 'Bloqueo automático de ingresos repetidos por examen.' },
            ].map(({ emoji, title, desc }) => (
                <div key={title} className="bg-bg-card border border-border rounded-xl p-6">
                  <div className="w-11 h-11 rounded-lg bg-primary-blue/10 flex items-center justify-center text-xl">
                    {emoji}
                  </div>
                  <h3 className="font-nunito text-card-title font-bold text-primary-navy mt-4">
                    {title}
                  </h3>
                  <p className="font-nunito text-body text-text-body mt-2">
                    {desc}
                  </p>
                </div>
            ))}
          </div>
        </section>

        {/* ===== ROLES DEL SISTEMA ===== */}
        <section className="px-8 py-16 bg-bg-card">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-nunito text-h2 font-extrabold text-primary-navy text-center">
              Un sistema, cuatro roles
            </h2>
            <p className="font-nunito text-body text-text-body text-center mt-2">
              Cada usuario accede solo a lo que necesita.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
              {[
                { emoji: '🧑‍💼', label: 'Administrador', desc: 'Usuarios, exámenes y ambientes' },
                { emoji: '🎓', label: 'Docente', desc: 'Exámenes y reportes', onClick: () => navigate('/Home/Docente') },
                { emoji: '🧍‍♂️', label: 'Personal de Control', desc: 'Verificación e ingreso' },
                { emoji: '📱', label: 'Estudiante', desc: 'Registro y código QR' },
              ].map(({ emoji, label, desc, onClick }) => (
                  <div
                      key={label}
                      onClick={onClick}
                      className={`border border-border rounded-xl p-5 text-center ${onClick ? 'cursor-pointer hover:border-primary-blue transition' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary-navy/5 flex items-center justify-center mx-auto text-xl">
                      {emoji}
                    </div>
                    <span className="text-badge font-bold uppercase text-primary-blue block mt-3">
                  {label}
                </span>
                    <p className="font-nunito text-secondary text-secondary-data mt-1">
                      {desc}
                    </p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="px-8 py-8 text-center">
          <p className="font-nunito text-secondary text-secondary-data">
            SCIEM-PASS · WindSoft · Universidad Mayor de San Simón
          </p>
        </footer>
      </div>
  );
}