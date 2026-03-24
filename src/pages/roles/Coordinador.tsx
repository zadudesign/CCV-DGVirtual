import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function CoordinadorDashboard() {
  const cursos = [
    { id: 1, nombre: 'Introducción a la Programación', docente: 'Ana Martínez', estado: 'En Desarrollo', progreso: 65 },
    { id: 2, nombre: 'Diseño de Interfaces', docente: 'Carlos Ruiz', estado: 'Revisión', progreso: 90 },
    { id: 3, nombre: 'Bases de Datos Avanzadas', docente: 'Laura Gómez', estado: 'Planificación', progreso: 15 },
    { id: 4, nombre: 'Arquitectura de Software', docente: 'Miguel Torres', estado: 'Publicado', progreso: 100 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel del Coordinador</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestión operativa de cursos, asignación de docentes y seguimiento de tareas en ClickUp.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-slate-900">Cursos a cargo</h3>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Nuevo Curso
          </button>
        </div>
        <ul className="divide-y divide-slate-200">
          {cursos.map((curso) => (
            <li key={curso.id} className="px-4 py-4 sm:px-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-indigo-600 truncate">{curso.nombre}</p>
                  <p className="text-sm text-slate-500 mt-1">Docente: {curso.docente}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm text-slate-500">
                    {curso.estado === 'Publicado' && <CheckCircle2 className="flex-shrink-0 mr-1.5 h-4 w-4 text-green-500" />}
                    {curso.estado === 'Revisión' && <AlertCircle className="flex-shrink-0 mr-1.5 h-4 w-4 text-amber-500" />}
                    {(curso.estado === 'En Desarrollo' || curso.estado === 'Planificación') && <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-blue-500" />}
                    {curso.estado}
                  </div>
                  <div className="mt-2 w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${curso.progreso}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
