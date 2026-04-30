import React, { useEffect, useState } from 'react';
import { Building2, BookOpen, Users, UserCheck, GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface StatsBarProps {
  user: User;
}

export default function StatsBar({ user }: StatsBarProps) {
  const [stats, setStats] = useState({
    programasVirtuales: 0,
    totalCursos: 0,
    docentesActivos: 0,
    paresEvaluadores: 0,
    extraStat: 0 // Facultades / Usuarios Totales
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user.id, user.facultad, user.programa]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const isAdmin = user.role === 'admin' || user.role === 'team' || user.role === 'educacion_continua' || 
                      ['Soporte', 'Multimedia', 'Diseño', 'Pedagogía'].includes(user.role);
      
      // Queries base
      let cursosQuery = supabase.from('cursos').select('programa, facultad', { count: 'exact' });
      let docentesQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'docente');
      let evaluadoresQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'evaluador');
      let extraQuery = supabase.from(isAdmin ? 'facultades' : 'programas').select('id', { count: 'exact' });

      // Aplicar filtros segun rol
      if (!isAdmin) {
        if (user.role === 'decano' && user.facultad) {
          cursosQuery = cursosQuery.eq('facultad', user.facultad);
          docentesQuery = docentesQuery.eq('facultad', user.facultad);
          evaluadoresQuery = evaluadoresQuery.eq('facultad', user.facultad);
          extraQuery = extraQuery.eq('facultad_id', (await supabase.from('facultades').select('id').eq('nombre', user.facultad).single()).data?.id || '');
        } else if (user.programa) {
          cursosQuery = cursosQuery.eq('programa', user.programa);
          docentesQuery = docentesQuery.eq('programa', user.programa);
          evaluadoresQuery = evaluadoresQuery.eq('programa', user.programa);
          // For Coordinador/Docente, extra stat could be something else, maybe total users
          extraQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('programa', user.programa);
        }
      }

      // Solo cursos activos (no publicados)
      const activeCursosStatus = ['Planificación', 'En Desarrollo', 'Revisión'];
      const coursesRes = await cursosQuery.in('estado', activeCursosStatus);
      
      // Programas virtuales (con cursos activos)
      let activeCoursesQuery = supabase.from('cursos')
        .select('programa, facultad, docente_id, evaluador_id')
        .in('estado', activeCursosStatus);

      if (!isAdmin) {
        if (user.role === 'decano' && user.facultad) {
          activeCoursesQuery = activeCoursesQuery.eq('facultad', user.facultad);
        } else if (user.programa) {
          activeCoursesQuery = activeCoursesQuery.eq('programa', user.programa);
        } else if (user.role === 'docente') {
          activeCoursesQuery = activeCoursesQuery.eq('docente_id', user.id);
        } else if (user.role === 'evaluador') {
          activeCoursesQuery = activeCoursesQuery.eq('evaluador_id', user.id);
        }
      }

      const activeCoursesRes = await activeCoursesQuery;
      const uniqueProgramasVirtuales = new Set((activeCoursesRes.data || []).map(c => c.programa)).size;

      const [docentesRes, evaluadoresRes, extraRes] = await Promise.all([
        docentesQuery,
        evaluadoresQuery,
        extraQuery
      ]);

      setStats({
        programasVirtuales: uniqueProgramasVirtuales,
        totalCursos: coursesRes.count || 0,
        docentesActivos: docentesRes.count || 0,
        paresEvaluadores: evaluadoresRes.count || 0,
        extraStat: extraRes.count || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatBox = ({ title, value, icon: Icon, color, bg }: { title: string, value: number, icon: any, color: string, bg: string }) => (
    <div className="bg-white overflow-hidden shadow-md rounded-xl border border-muted/20 hover:shadow-lg transition-all duration-300 group">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-xl ${bg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-[10px] font-bold text-secondary uppercase tracking-wider truncate mb-1">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-3xl font-extrabold text-primary">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
                  ) : (
                    value
                  )}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className={`h-1 w-full ${bg} opacity-50 group-hover:opacity-100 transition-opacity`} />
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
      <StatBox 
        title="Programas Virtuales" 
        value={stats.programasVirtuales} 
        icon={Building2} 
        color="text-slate-600" 
        bg="bg-slate-100"
      />
      <StatBox 
        title="Cursos" 
        value={stats.totalCursos} 
        icon={BookOpen} 
        color="text-amber-600" 
        bg="bg-amber-50"
      />
      <StatBox 
        title="Docentes Activos" 
        value={stats.docentesActivos} 
        icon={Users} 
        color="text-blue-600" 
        bg="bg-blue-50"
      />
      <StatBox 
        title="Pares Evaluadores" 
        value={stats.paresEvaluadores} 
        icon={UserCheck} 
        color="text-purple-600" 
        bg="bg-purple-50"
      />
    </div>
  );
}
