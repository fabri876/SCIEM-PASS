export default function Toast({ toast, onClose }) {
    if (!toast) return null;
    const cls = toast.type === 'error'
        ? 'bg-red-50 border-red-200 text-rose-600'
        : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#003770]';
    return (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[120] flex items-center justify-between sm:justify-start gap-3 px-5 py-3.5 rounded-2xl shadow-lg border text-sm font-bold font-nunito ${cls}`} role="status">
            <span className="break-words">{toast.message}</span>
            <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100 font-black cursor-pointer flex-shrink-0">✕</button>
        </div>
    );
}