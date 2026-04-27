import React, { useState, useEffect } from 'react';
import { GraduationCap, FolderKanban, Plus, Loader2, CheckCircle2, ChevronRight, Calendar, Clock, CheckCircle, Bell, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { TareaTimerItem } from '../components/TareaTimerItem';
import { useAuth } from '../contexts/AuthContext';
import { HOURLY_RATES } from '../lib/constants';

export default function EducacionContinua() {
  const { user } = useAuth();
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [selectedProyecto, setSelectedProyecto] = useState<string | null>(null);
  const [newProyectoName, setNewProyectoName] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTareas, setLoadingTareas] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [hourlyRates, setHourlyRates] = useState<Record<string, number>>(HOURLY_RATES);
  const [loadingRates, setLoadingRates] = useState(false);
  const isAdmin = user?.role === 'admin';
  const isTeam = ['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '');
  const isEducacionContinua = user?.role === 'EducacionContinua';
  
  const canSeeTareas = isAdmin || isTeam || isEducacionContinua;
  const canSeeProyectos = isAdmin || isEducacionContinua;
  const [activeTab, setActiveTab] = useState<'tareas' | 'proyectos'>(canSeeTareas ? 'tareas' : 'proyectos');

  // Sólo roles admin y team pueden editar/modificar tareas. EducacionContinua es solo lectura.
  const canEdit = isAdmin || isTeam;
  const canEditProyectos = isAdmin;

  useEffect(() => {
    if (!canSeeTareas && canSeeProyectos && activeTab === 'tareas') {
      setActiveTab('proyectos');
    }
    if (!canSeeProyectos && canSeeTareas && activeTab === 'proyectos') {
      setActiveTab('tareas');
    }
  }, [user, isAdmin, isTeam, activeTab]);

  useEffect(() => {
    fetchProyectos();
    fetchAllTasks();
    fetchRates();
  }, [user]);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_tarifas')
        .select('*');
      
      if (!error && data && data.length > 0) {
        const ratesMap: Record<string, number> = { ...HOURLY_RATES };
        data.forEach((r: any) => {
          ratesMap[r.nombre_tipo] = r.tarifa_hora;
        });
        setHourlyRates(ratesMap);
      }
    } catch (e) {
      console.error('Error fetching rates:', e);
    }
  };

  const handleUpdateRoleRate = async (tipo: string, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, '')) || 0;
    try {
      setLoadingRates(true);
      const { error } = await supabase
        .from('configuracion_tarifas')
        .upsert({ 
          nombre_tipo: tipo, 
          tarifa_hora: numValue 
        }, { onConflict: 'nombre_tipo' });
      
      if (error) throw error;
      setHourlyRates(prev => ({ ...prev, [tipo]: numValue }));
      setSuccess(`Tarifa de ${tipo} actualizada correctamente`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating rate:', err);
      // If table doesn't exist yet, we inform the user
      if (err.code === '42P01') {
        setError('La tabla "configuracion_tarifas" no existe en Supabase.');
      } else {
        setError('Error al actualizar la tarifa.');
      }
    } finally {
      setLoadingRates(false);
    }
  };

  const fetchProyectos = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('proyectos_ec')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        if (error.code !== '42P01') throw error;
      } else {
        setProyectos(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching proyectos:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAllTasks = async () => {
    try {
      setLoadingTareas(true);
      
      // Obtenemos los nombres de todos los proyectos de EC para filtrar
      const { data: pData } = await supabase.from('proyectos_ec').select('nombre');
      const pNames = pData?.map(p => p.nombre) || [];
      
      if (pNames.length === 0) {
        setTareas([]);
        return;
      }

      let query = supabase
        .from('notificaciones_tareas')
        .select('*')
        .in('proyecto', pNames);

      if (user?.role !== 'admin' && user?.role !== 'EducacionContinua') {
        const area = user?.team_area || user?.role;
        query = query.or(`usuario_id.eq.${user?.id},rol_destino.eq.${area}`);
      }

      const { data, error } = await query.order('fecha_vencimiento', { ascending: true });

      if (error) {
        if (error.code !== '42P01') throw error;
      } else {
        setTareas(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching all tasks:', err);
    } finally {
      setLoadingTareas(false);
    }
  };

  const handleAddProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProyectoName.trim()) return;
    
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('proyectos_ec')
        .insert([{ nombre: newProyectoName.trim() }])
        .select()
        .single();

      if (error) throw error;

      await fetchProyectos();
      await fetchAllTasks();
      setNewProyectoName('');
      setSuccess('Proyecto agregado con éxito');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al agregar proyecto. Asegúrate de haber creado la tabla en Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

  const tareasDelProyecto = selectedProyecto ? tareas.filter(t => t.proyecto === selectedProyecto) : [];
  const totalProjectSeconds = tareasDelProyecto.reduce((acc, tarea) => acc + (tarea.tiempo_invertido || 0), 0);
  
  const totalProjectCost = tareasDelProyecto.reduce((acc, tarea) => {
    const rate = hourlyRates[tarea.tipo_tarifa as string] || 0;
    const hours = (tarea.tiempo_invertido || 0) / 3600;
    return acc + (hours * rate);
  }, 0);

  const globalTotalCost = tareas.reduce((acc, tarea) => {
    const rate = hourlyRates[tarea.tipo_tarifa as string] || 0;
    const hours = (tarea.tiempo_invertido || 0) / 3600;
    return acc + (hours * rate);
  }, 0);

  const getProjectCost = (projectName: string) => {
    return tareas
      .filter(t => t.proyecto === projectName)
      .reduce((acc, tarea) => {
        const rate = hourlyRates[tarea.tipo_tarifa as string] || 0;
        const hours = (tarea.tiempo_invertido || 0) / 3600;
        return acc + (hours * rate);
      }, 0);
  };

  const formatTotalTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Categorización de tareas para el nuevo listado (solo pendientes/en progreso)
  const categorizarTareas = () => {
    const vencidas: any[] = [];
    const enProgreso: any[] = [];
    const today = startOfDay(new Date());

    tareas.forEach(tarea => {
      // Por si acaso llegan tareas completadas, las ignoramos
      if (tarea.estado === 'Completada' || tarea.estado === 'Completado') {
        return;
      }

      if (!tarea.fecha_vencimiento) {
        enProgreso.push(tarea);
        return;
      }

      const dueDate = startOfDay(parseISO(tarea.fecha_vencimiento));
      const diffDays = differenceInDays(dueDate, today);

      if (diffDays < 0) {
        vencidas.push(tarea);
      } else {
        enProgreso.push(tarea);
      }
    });

    const sortByDate = (a: any, b: any) => {
      const dateA = new Date(a.fecha_vencimiento || 0).getTime();
      const dateB = new Date(b.fecha_vencimiento || 0).getTime();
      return dateA - dateB;
    };

    return {
      vencidas: vencidas.sort(sortByDate),
      enProgreso: enProgreso.sort(sortByDate)
    };
  };

  const { vencidas, enProgreso } = categorizarTareas();

  const getTrafficLightStatus = (fecha: string, estado: string) => {
    if (estado === 'Completada' || estado === 'Completado') {
      return {
        color: 'bg-green-50 text-green-700 border-green-100',
        iconBg: 'bg-green-500',
        label: 'Completada'
      };
    }

    if (!fecha) return { color: 'bg-yellow-50 text-yellow-700 border-yellow-100', iconBg: 'bg-yellow-500', label: 'En Progreso' };

    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(fecha));
    const diffDays = differenceInDays(dueDate, today);

    if (diffDays < 0) {
      const daysLate = Math.abs(diffDays);
      return {
        color: 'bg-red-50 text-red-700 border-red-100',
        iconBg: 'bg-red-500',
        label: `Vencida (${daysLate} día${daysLate === 1 ? '' : 's'} de retraso)`
      };
    } else {
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        iconBg: 'bg-yellow-500',
        label: 'En Progreso'
      };
    }
  };

  const renderCategorizedList = (title: string, events: any[], colorClass: string, bgClass: string) => (
    <div className="flex-1 min-w-[300px]">
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center ${colorClass}`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${bgClass}`}></div>
        {title} ({events.length})
      </h3>
      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-xs text-secondary italic py-2">No hay tareas</p>
        ) : (
          events.map((tarea, idx) => (
            <TareaTimerItem 
              key={tarea.id || idx} 
              tarea={tarea} 
              onUpdate={fetchAllTasks} 
              hideType={true}
              hideRole={true}
              readOnly={!canEdit}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-main flex items-center">
          <GraduationCap className="mr-3 h-8 w-8 text-primary" />
          Educación Continua
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Gestión y seguimiento de proyectos de Educación Continua.
        </p>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex border-b border-muted/30 -mb-px">
        {canSeeTareas && (
          <button
            onClick={() => setActiveTab('tareas')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
              activeTab === 'tareas'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
            }`}
          >
            <CheckCircle className={`mr-2 h-4 w-4 ${activeTab === 'tareas' ? 'text-primary' : 'text-slate-400'}`} />
            Tareas
          </button>
        )}
        {canSeeProyectos && (
          <button
            onClick={() => setActiveTab('proyectos')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
              activeTab === 'proyectos'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
            }`}
          >
            <FolderKanban className={`mr-2 h-4 w-4 ${activeTab === 'proyectos' ? 'text-primary' : 'text-slate-400'}`} />
            Proyectos
          </button>
        )}
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'proyectos' && (
        <>
          {isAdmin && (
            <div className="bg-emerald-600 rounded-xl p-6 text-white shadow-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:shadow-xl border border-emerald-500/50">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <FolderKanban className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider opacity-80">Inversión Global de Educación Continua</h3>
                  <p className="text-3xl font-mono font-bold">
                    ${globalTotalCost.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase opacity-70">Total Proyectos</span>
                  <span className="text-xl font-bold">{proyectos.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase opacity-70">Total Tareas EC</span>
                  <span className="text-xl font-bold">{tareas.length}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel Proyectos */}
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden flex flex-col">
          <div className="px-4 py-5 sm:px-6 border-b border-muted/30 bg-slate-100">
            <h3 className="text-lg leading-6 font-medium text-text-main flex items-center">
              <FolderKanban className="mr-2 h-5 w-5 text-primary" />
              Proyectos
            </h3>
            <p className="mt-1 text-xs text-secondary">
              {canEditProyectos
                ? 'Agrega los proyectos que se trabajarán en Educación Continua.'
                : 'Proyectos disponibles en Educación Continua.'}
            </p>
          </div>
          {canEditProyectos && (
            <div className="p-4 border-b border-slate-100">
              <form onSubmit={handleAddProyecto} className="flex gap-2">
                <input
                  type="text"
                  value={newProyectoName}
                  onChange={(e) => setNewProyectoName(e.target.value)}
                  placeholder="Nombre del nuevo proyecto..."
                  className="flex-1 shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-muted rounded-md py-2 px-3 border"
                />
                <button
                  type="submit"
                  disabled={!newProyectoName.trim() || submitting}
                  className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                </button>
              </form>
            </div>
          )}
          <div className="flex-1 overflow-y-auto max-h-96 p-4">
            {loadingData ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 text-slate-400 animate-spin" /></div>
            ) : proyectos.length === 0 ? (
              <p className="text-sm text-secondary text-center py-4">No hay proyectos registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                 {proyectos.map(proyecto => {
                   const projectCost = getProjectCost(proyecto.nombre);
                   return (
                     <li 
                       key={proyecto.id} 
                       onClick={() => setSelectedProyecto(proyecto.nombre)}
                       className={`py-3 flex justify-between items-center px-3 rounded-md transition-colors cursor-pointer ${
                         selectedProyecto === proyecto.nombre ? 'bg-primary/10 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'
                       }`}
                     >
                       <div className="flex flex-col">
                         <span className={`text-sm font-medium ${selectedProyecto === proyecto.nombre ? 'text-primary' : 'text-text-main'}`}>
                           {proyecto.nombre}
                         </span>
                         {projectCost > 0 && (
                           <span className="text-[10px] font-mono font-bold text-emerald-600">
                             ${projectCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                           </span>
                         )}
                       </div>
                       <div className="flex items-center text-xs text-secondary">
                         <span className="mr-2">{new Date(proyecto.created_at).toLocaleDateString()}</span>
                         <ChevronRight className={`h-4 w-4 ${selectedProyecto === proyecto.nombre ? 'text-primary' : 'text-slate-300'}`} />
                       </div>
                     </li>
                   );
                 })}
              </ul>
            )}
          </div>
        </div>

        {/* Panel Tareas del Proyecto */}
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden flex flex-col">
          <div className="px-4 py-5 sm:px-6 border-b border-muted/30 bg-slate-100 flex justify-between items-start">
            <div>
              <h3 className="text-lg leading-6 font-medium text-text-main flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Tareas del Proyecto
              </h3>
              <p className="mt-1 text-xs text-secondary">
                {selectedProyecto ? `Tareas asignadas a: ${selectedProyecto}` : 'Selecciona un proyecto para ver sus tareas.'}
              </p>
            </div>
            {selectedProyecto && tareas.length > 0 && (
              <div className="flex gap-2">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-muted/50 shadow-sm flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Tiempo Total</span>
                  <span className="text-sm font-mono font-bold text-primary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTotalTime(totalProjectSeconds)}
                  </span>
                </div>
                <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Inversión Estimada</span>
                  <span className="text-sm font-mono font-bold text-emerald-600">
                    ${totalProjectCost.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] p-4 bg-slate-50/50">
            {!selectedProyecto ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <FolderKanban className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-secondary">Selecciona un proyecto de la lista<br/>para ver sus tareas asociadas.</p>
              </div>
            ) : loadingTareas ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 text-slate-400 animate-spin" /></div>
            ) : tareasDelProyecto.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-secondary">No hay tareas registradas para este proyecto.</p>
                <p className="text-xs text-slate-400 mt-1">Puedes agregar tareas desde el Calendario de Trabajo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tareasDelProyecto.map(tarea => (
                  <TareaTimerItem 
                    key={tarea.id} 
                    tarea={tarea} 
                    onUpdate={fetchAllTasks}
                    customRates={hourlyRates}
                    hideType={true}
                    hideRole={true}
                    readOnly={!canEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Listado de Tareas Clasificadas */}
      {activeTab === 'tareas' && (
        <div className="bg-white/50 shadow-sm rounded-xl border border-muted/30 p-6">
          <div className="flex items-center mb-6">
            <CheckCircle className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-bold text-text-main">Listado General de Tareas de Educación Continua</h2>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8 overflow-x-auto pb-4">
            {renderCategorizedList('Tareas Vencidas', vencidas, 'text-red-700', 'bg-red-500')}
            {renderCategorizedList('Tareas En Progreso', enProgreso, 'text-amber-700', 'bg-amber-500')}
          </div>
        </div>
      )}

      {activeTab === 'proyectos' && isAdmin && (
        <div className="mt-8 bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden">
          <div className="px-6 py-5 border-b border-muted/30 bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-text-main flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" />
                Configuración de Tarifas por Hora
              </h3>
              <p className="text-xs text-secondary mt-1">Define el valor de la hora para cada tipo de tarea en Educación Continua.</p>
            </div>
            {loadingRates && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.keys(HOURLY_RATES).map((tipo) => (
                <div key={tipo} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">{tipo}</span>
                    <span className="text-[10px] uppercase font-bold text-primary bg-primary/5 px-2 py-1 rounded">Valor / Hora</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="text"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary text-sm font-bold text-slate-600 outline-none transition-all"
                      defaultValue={hourlyRates[tipo]?.toLocaleString('es-CO')}
                      onBlur={(e) => handleUpdateRoleRate(tipo, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-blue-700 leading-relaxed">
                Los cambios realizados aquí se aplicarán a todos los cálculos de "Inversión Estimada" de forma inmediata tanto en proyectos existentes como en tareas nuevas. 
                <strong> Presiona Enter o haz clic fuera del campo para guardar los cambios.</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
