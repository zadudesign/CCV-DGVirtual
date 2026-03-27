import React, { useState, useEffect } from 'react';
import { FileText, UploadCloud, CheckCircle, BookOpen, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Curso } from '../../types';
import { Link } from 'react-router-dom';

export default function DocenteDashboard() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch cursos asignados al docente
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select(`
          *,
          evaluador:profiles!evaluador_id(name)
        `)
        .eq('docente_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (cursosError) throw cursosError;
      setCursos(cursosData as Curso[] || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const totalCursos = cursos.length;
  const cursosEnDesarrollo = cursos.filter(c => c.estado === 'En Desarrollo').length;
  const cursosRevision = cursos.filter(c => c.estado === 'Revisión').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel del Docente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sube tus materiales, completa formularios y sigue el progreso de tus cursos asignados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-indigo-100">
                <BookOpen className="h-6 w-6 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Cursos Asignados</dt>
                  <dd>
                    <div className="text-2xl font-bold text-slate-900">{totalCursos}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">En Desarrollo</dt>
                  <dd>
                    <div className="text-2xl font-bold text-slate-900">{cursosEnDesarrollo}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">En Revisión</dt>
                  <dd>
                    <div className="text-2xl font-bold text-slate-900">{cursosRevision}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mis Cursos */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-medium text-slate-900 flex items-center">
              <BookOpen className="mr-2 h-5 w-5 text-indigo-600" />
              Mis Cursos
            </h2>
            <Link to="/cursos" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Ver Todos
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {cursos.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No tienes cursos asignados.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cursos.slice(0, 5).map((curso) => (
                  <li key={curso.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{curso.nombre}</p>
                        <p className="text-xs text-slate-500 mt-1">{curso.programa}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          curso.estado === 'Publicado' ? 'bg-green-100 text-green-800' :
                          curso.estado === 'Revisión' ? 'bg-amber-100 text-amber-800' :
                          curso.estado === 'En Desarrollo' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {curso.estado}
                        </span>
                        <span className="text-xs font-medium text-slate-500 mt-2">{curso.progreso}% completado</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
            <Link to="/cursos" className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <FileText className="h-6 w-6 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-900">Actualizar Progreso</p>
                <p className="text-xs text-slate-500">Ve a la sección de cursos para actualizar el estado.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
