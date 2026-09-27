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
        <div className="font-nunito">
            {/* VISTAS MODULARES */}
            {vista === 'MATERIAS' ? (
                <GestionMateriasAdmin onSeleccionarMateria={fnSeleccionarMateria} />
            ) : (
                <TablaHabilitacionesEstudiantes materia={materiaSeleccionada} onVolver={fnVolverAMaterias} />
            )}
        </div>
    );
}
