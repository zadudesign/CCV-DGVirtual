import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Users, BookOpen, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Curso } from '../../types';
import { Link } from 'react-router-dom';

export default function TeamDashboard() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name)
        `)
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Equipo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bienvenido al área de {user?.team_area || user?.role || 'Trabajo'}.
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
                  <dt className="text-sm font-medium text-slate-500 truncate">Total Cursos</dt>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-medium text-slate-900 flex items-center">
              <BookOpen className="mr-2 h-5 w-5 text-indigo-600" />
              Cursos Recientes
            </h2>
            <Link to="/cursos" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Ver Todos
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {cursos.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No hay cursos registrados.</div>
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

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Mis Tareas</h2>
            </div>
            <p className="text-slate-600 text-sm">
              Aquí podrás ver las tareas asignadas a tu área de {user?.team_area || user?.role}.
            </p>
          </div>

          <Link to="/usuarios" className="block bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Directorio</h2>
            </div>
            <p className="text-slate-600 text-sm">
              Accede al directorio de usuarios de la plataforma.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
