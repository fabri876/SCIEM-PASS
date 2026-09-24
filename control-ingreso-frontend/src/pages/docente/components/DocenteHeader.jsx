import Header from '../../../components/layout/Header';
import UserAccountMenu from '../../../components/common/UserAccountMenu';

export default function DocenteHeader({ usuario, onCerrarSesion }) {
    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 overflow-hidden"><Header strRutaActiva="Exámenes" /></div>
                <div className="h-[64px] sm:h-[98px] flex items-center pr-2 sm:pr-[55px] pl-2 sm:pl-4 bg-white shrink-0">
                    <UserAccountMenu usuario={usuario} onCerrarSesion={onCerrarSesion} strClaseAvatar="bg-[#1A365D]" />
                </div>
            </div>
        </div>
    );
}