import Header from '../../../components/layout/Header';

// El menú de cuenta (cambiar contraseña / cerrar sesión) ya vive dentro de
// Header.jsx, así que este wrapper solo aporta el posicionamiento fijo.
export default function DocenteHeader() {
    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
            <Header strRutaActiva="Exámenes" />
        </div>
    );
}