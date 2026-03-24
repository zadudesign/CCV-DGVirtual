import React from 'react';
import { Search, Star, MessageSquare } from 'lucide-react';

export default function EvaluadorDashboard() {
  const cursosARevisar = [
    { id: 1, titulo: 'Introducción a la Programación', docente: 'Ana Martínez', fechaAsignacion: '10 Oct 2023', estado: 'Pendiente' },
    { id: 2, titulo: 'Diseño de Interfaces', docente: 'Carlos Ruiz', fechaAsignacion: '15 Oct 2023', estado: 'En Revisión' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel del Par Evaluador</h1>
        <p className="mt-1 text-sm text-slate-500">
          Revisa cursos, evalúa la calidad del contenido y proporciona retroalimentación.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-slate-900">Cursos Asignados para Revisión</h3>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border"
              placeholder="Buscar curso..."
            />
          </div>
        </div>
        
        <div className="divide-y divide-slate-200">
          {cursosARevisar.map((curso) => (
            <div key={curso.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium text-indigo-600">{curso.titulo}</h4>
                  <p className="text-sm text-slate-500 mt-1">Docente: {curso.docente} • Asignado: {curso.fechaAsignacion}</p>
                </div>
                <div className="flex space-x-3">
                  <button className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <MessageSquare className="h-4 w-4 mr-2 text-slate-400" />
                    Feedback
                  </button>
                  <button className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <Star className="h-4 w-4 mr-2" />
                    Evaluar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
