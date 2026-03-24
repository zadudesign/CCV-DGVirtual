import React from 'react';
import { FileText, UploadCloud, CheckCircle } from 'lucide-react';

export default function DocenteDashboard() {
  const tareas = [
    { id: 1, titulo: 'Subir Sílabo del Curso', estado: 'Completado', fecha: '12 Oct 2023' },
    { id: 2, titulo: 'Grabar Módulo 1: Introducción', estado: 'Pendiente', fecha: '20 Oct 2023' },
    { id: 3, titulo: 'Diseñar Evaluaciones Módulo 1', estado: 'En Progreso', fecha: '25 Oct 2023' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel del Docente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sube tus materiales, completa formularios en Tally y sigue el progreso de tus cursos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tareas Pendientes */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
            <FileText className="mr-2 h-5 w-5 text-indigo-600" />
            Mis Tareas (ClickUp)
          </h2>
          <div className="space-y-4">
            {tareas.map((tarea) => (
              <div key={tarea.id} className="flex items-start justify-between p-4 border border-slate-100 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{tarea.titulo}</p>
                  <p className="text-xs text-slate-500 mt-1">Vence: {tarea.fecha}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tarea.estado === 'Completado' ? 'bg-green-100 text-green-800' :
                  tarea.estado === 'En Progreso' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {tarea.estado}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 gap-4">
            <button className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <UploadCloud className="h-6 w-6 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-900">Subir Material de Clase</p>
                <p className="text-xs text-slate-500">Sube PDFs, presentaciones o videos.</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <CheckCircle className="h-6 w-6 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-900">Completar Formulario Tally</p>
                <p className="text-xs text-slate-500">Llena la información requerida del módulo.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
