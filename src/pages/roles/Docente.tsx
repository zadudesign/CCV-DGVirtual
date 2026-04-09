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
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const totalCursos = cursos.length;
  const cursosEnDesarrollo = cursos.filter(c => c.estado === 'En Desarrollo').length;
  const cursosRevision = cursos.filter(c => c.estado === 'Revisión').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Panel del Docente</h1>
        <p className="mt-1 text-sm text-secondary">
          Sube tus materiales, completa formularios y sigue el progreso de tus cursos asignados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-muted/30">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-primary/20">
                <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-secondary truncate">Cursos Asignados</dt>
                  <dd>
                    <div className="text-2xl font-bold text-text-main">{totalCursos}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-muted/30">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-secondary truncate">En Desarrollo</dt>
                  <dd>
                    <div className="text-2xl font-bold text-text-main">{cursosEnDesarrollo}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-muted/30">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-secondary truncate">En Revisión</dt>
                  <dd>
                    <div className="text-2xl font-bold text-text-main">{cursosRevision}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mis Cursos */}
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-muted/30 flex justify-between items-center bg-background">
            <h2 className="text-lg font-medium text-text-main flex items-center">
              <BookOpen className="mr-2 h-5 w-5 text-primary" />
              Mis Cursos
            </h2>
            <Link to="/cursos" className="text-sm font-medium text-primary hover:text-primary-hover">
              Ver Todos
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {cursos.length === 0 ? (
              <div className="p-6 text-center text-secondary text-sm">No tienes cursos asignados.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cursos.slice(0, 5).map((curso) => (
                  <li key={curso.id} className="p-6 hover:bg-background transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-main">{curso.nombre}</p>
                        <p className="text-xs text-secondary mt-1">{curso.programa}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          curso.estado === 'Publicado' ? 'bg-green-100 text-green-800' :
                          curso.estado === 'Revisión' ? 'bg-amber-100 text-amber-800' :
                          curso.estado === 'En Desarrollo' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-text-main'
                        }`}>
                          {curso.estado}
                        </span>
                        <span className="text-xs font-medium text-secondary mt-2">{curso.progreso}% completado</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 p-6">
          <h2 className="text-lg font-medium text-text-main mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 gap-4">
            <button className="flex items-center p-4 border border-muted/30 rounded-lg hover:bg-background transition-colors text-left">
              <UploadCloud className="h-6 w-6 text-primary mr-3" />
              <div>
                <p className="text-sm font-medium text-text-main">Subir Material de Clase</p>
                <p className="text-xs text-secondary">Sube PDFs, presentaciones o videos.</p>
              </div>
            </button>
            <button className="flex items-center p-4 border border-muted/30 rounded-lg hover:bg-background transition-colors text-left">
              <CheckCircle className="h-6 w-6 text-primary mr-3" />
              <div>
                <p className="text-sm font-medium text-text-main">Completar Formulario Tally</p>
                <p className="text-xs text-secondary">Llena la información requerida del módulo.</p>
              </div>
            </button>
            <Link to="/cursos" className="flex items-center p-4 border border-muted/30 rounded-lg hover:bg-background transition-colors text-left">
              <FileText className="h-6 w-6 text-primary mr-3" />
              <div>
                <p className="text-sm font-medium text-text-main">Actualizar Progreso</p>
                <p className="text-xs text-secondary">Ve a la sección de cursos para actualizar el estado.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
