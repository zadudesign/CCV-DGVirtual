import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function EducacionContinua() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-main flex items-center">
          <GraduationCap className="mr-3 h-8 w-8 text-primary" />
          Educación Continua
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Gestión y seguimiento de programas de Educación Continua.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-muted/30 p-8 text-center">
        <GraduationCap className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-text-main mb-2">Módulo en construcción</h3>
        <p className="text-secondary max-w-md mx-auto">
          Esta sección está siendo desarrollada para el equipo de Diseño, Soporte, Pedagogía y Multimedia.
        </p>
      </div>
    </div>
  );
}
