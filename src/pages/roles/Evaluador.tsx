import React, { useState, useEffect } from 'react';
import { Search, Star, MessageSquare, CheckCircle2, AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Curso } from '../../types';
import { Link } from 'react-router-dom';

export default function EvaluadorDashboard() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch cursos asignados al evaluador
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name)
        `)
        .eq('evaluador_id', user?.id)
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
  const cursosRevision = cursos.filter(c => c.estado === 'Revisión').length;
  const cursosPublicados = cursos.filter(c => c.estado === 'Publicado').length;

  const filteredCursos = cursos.filter(curso => 
    curso.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    curso.docente?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel del Par Evaluador</h1>
        <p className="mt-1 text-sm text-slate-500">
          Revisa cursos, evalúa la calidad del contenido y proporciona retroalimentación.
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
              <div className="flex-shrink-0 p-3 rounded-lg bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Pendientes de Revisión</dt>
                  <dd>
                    <div className="text-2xl font-bold text-slate-900">{cursosRevision}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Cursos Aprobados</dt>
                  <dd>
                    <div className="text-2xl font-bold text-slate-900">{cursosPublicados}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h3 className="text-lg leading-6 font-medium text-slate-900">Cursos Asignados para Revisión</h3>
          <div className="relative rounded-md shadow-sm max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border"
              placeholder="Buscar curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="divide-y divide-slate-200">
          {filteredCursos.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No se encontraron cursos asignados.</div>
          ) : (
            filteredCursos.map((curso) => (
              <div key={curso.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-medium text-indigo-600">{curso.nombre}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        curso.estado === 'Publicado' ? 'bg-green-100 text-green-800' :
                        curso.estado === 'Revisión' ? 'bg-amber-100 text-amber-800' :
                        curso.estado === 'En Desarrollo' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {curso.estado}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Docente: {curso.docente?.name || 'Sin asignar'} • Programa: {curso.programa}</p>
                  </div>
                  <div className="flex space-x-3">
                    <Link to="/cursos" className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <MessageSquare className="h-4 w-4 mr-2 text-slate-400" />
                      Feedback
                    </Link>
                    <Link to="/cursos" className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <Star className="h-4 w-4 mr-2" />
                      Evaluar
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
