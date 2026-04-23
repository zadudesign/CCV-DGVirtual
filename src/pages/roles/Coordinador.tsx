import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, BookOpen, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Curso } from '../../types';
import { Link } from 'react-router-dom';
import StatsBar from '../../components/StatsBar';

export default function CoordinadorDashboard() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.programa) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch cursos del programa
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name)
        `)
        .eq('programa', user?.programa)
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

  if (!user) return null;

  const totalCursos = cursos.length;
  const cursosEnDesarrollo = cursos.filter(c => c.estado === 'En Desarrollo').length;
  
  const stats = [
    { name: 'Total Cursos', value: totalCursos.toString(), icon: BookOpen, color: 'text-primary', bg: 'bg-primary/20' },
    { name: 'Docentes Activos', value: docentesCount.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Cursos en Desarrollo', value: cursosEnDesarrollo.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Cursos Publicados', value: cursos.filter(c => c.estado === 'Publicado').length.toString(), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Panel del Coordinador</h1>
        <p className="mt-1 text-sm text-secondary">
          Gestión operativa de cursos y seguimiento del programa de {user?.programa}.
        </p>
      </div>

      <StatsBar user={user} />

      <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden">
        <div className="px-6 py-5 border-b border-muted/30 flex justify-between items-center bg-background">
          <h3 className="text-lg leading-6 font-medium text-text-main">Cursos a cargo</h3>
          <Link to="/cursos" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
            Ver Todos
          </Link>
        </div>
        
        {cursos.length === 0 ? (
          <div className="p-6 text-center text-secondary">No hay cursos registrados en este programa.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {cursos.slice(0, 10).map((curso) => (
              <li key={curso.id} className="px-6 py-5 hover:bg-background transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-primary truncate">{curso.nombre}</p>
                    <p className="text-sm text-secondary mt-1">Docente: {curso.docente?.name || 'Sin asignar'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center text-sm font-medium text-text-main">
                      {curso.estado === 'Publicado' && <CheckCircle2 className="flex-shrink-0 mr-1.5 h-4 w-4 text-green-500" />}
                      {curso.estado === 'Revisión' && <AlertCircle className="flex-shrink-0 mr-1.5 h-4 w-4 text-amber-500" />}
                      {(curso.estado === 'En Desarrollo' || curso.estado === 'Planificación') && <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-blue-500" />}
                      {curso.estado}
                    </div>
                    <div className="mt-3 flex items-center w-48">
                      <div className="w-full bg-slate-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${curso.progreso}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-secondary w-8 text-right">{curso.progreso}%</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
