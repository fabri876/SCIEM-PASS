//Ventana emergente reutilizable

export default function VentanaEmergente({ boolAbierto, onCerrar, children, strMaxWidth = "max-w-2xl" }) {
    if (!boolAbierto) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={onCerrar}
        >
            <div
                className={`bg-white rounded-lg shadow-xl w-full ${strMaxWidth} max-h-[85vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}