import React, { useState } from 'react';
import GestionMateriasAdmin from './GestionMateriasAdmin';
import TablaHabilitacionesEstudiantes from '../../../components/habilitaciones/TablaHabilitacionesEstudiantes';

export default function SeccionGestionHabilitacionesAdmin() {
    const [vista, setVista] = useState('MATERIAS'); // 'MATERIAS' | 'NOMINA'
    const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
    const fnSeleccionarMateria = (materia) => {
        setMateriaSeleccionada(materia);
        setVista('NOMINA');
    };

    const fnVolverAMaterias = () => {
        setVista('MATERIAS');
        setMateriaSeleccionada(null);
    };

    return (
        <div className="space-y-4 font-nunito">
            {/* MIGAS DE PAN (BREADCRUMB) Y BOTÓN DE RETORNO */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-400 font-bold overflow-x-auto">
                    <span className="hover:text-slate-600 transition">Habilitación de Estudiantes</span>
                    <span>&gt;</span>
                    <span
                        onClick={fnVolverAMaterias}
                        className={`transition cursor-pointer ${vista === 'MATERIAS' ? 'text-[#1A365D] font-extrabold' : 'hover:text-slate-600'}`}
                    >
                        Asignaturas
                    </span>
                    {vista === 'NOMINA' && materiaSeleccionada && (
                        <>
                            <span>&gt;</span>
                            <span className="bg-blue-100/70 text-primary-blue font-extrabold px-2 py-0.5 rounded-md">
                                {materiaSeleccionada.nombre}
                            </span>
                        </>
                    )}
                </div>

                {vista === 'NOMINA' && (
                    <button
                        type="button"
                        onClick={fnVolverAMaterias}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-2 px-3.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                        <span>←</span>
                        <span>Volver a Materias</span>
                    </button>
                )}
            </div>

            {/* VISTAS MODULARES */}
            {vista === 'MATERIAS' ? (
                <GestionMateriasAdmin onSeleccionarMateria={fnSeleccionarMateria} />
            ) : (
                <TablaHabilitacionesEstudiantes materia={materiaSeleccionada} />
            )}
        </div>
    );
}
