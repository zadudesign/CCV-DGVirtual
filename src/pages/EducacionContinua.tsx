import React, { useState, useEffect } from 'react';
import { GraduationCap, FolderKanban, Plus, Loader2, CheckCircle2, ChevronRight, Calendar, Clock, CheckCircle, Play, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TareaTimerItem = ({ tarea, onUpdate }: { tarea: any, onUpdate: () => void }) => {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalSeconds = (tarea.tiempo_invertido || 0) + sessionSeconds;
  const isCompleted = tarea.estado === 'Completada' || tarea.estado === 'Completado';

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && !isCompleted) {
      interval = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isCompleted]);

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = async () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      await saveTime(totalSeconds);
    } else {
      setIsTimerRunning(true);
    }
  };

  const saveTime = async (newTotalSeconds: number) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('notificaciones_tareas')
        .update({ tiempo_invertido: newTotalSeconds })
        .eq('id', tarea.id);
      
      if (error) throw error;
      setSessionSeconds(0);
      onUpdate();
    } catch (err) {
      console.error('Error saving time:', err);
      alert('Error al guardar el tiempo');
    } finally {
      setSaving(false);
    }
  };

  const handleAddManualTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const addedSeconds = (manualHours * 3600) + (manualMinutes * 60);
    if (addedSeconds > 0) {
      await saveTime((tarea.tiempo_invertido || 0) + addedSeconds);
      setShowManualInput(false);
      setManualHours(0);
      setManualMinutes(0);
    }
  };

  const handleCompleteTask = async () => {
    if (totalSeconds === 0) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('notificaciones_tareas')
        .update({ 
          estado: 'Completada', 
          fecha_completada: new Date().toISOString(),
          tiempo_invertido: totalSeconds
        })
        .eq('id', tarea.id);
      
      if (error) throw error;
      setIsTimerRunning(false);
      setSessionSeconds(0);
      onUpdate();
    } catch (err) {
      console.error('Error completing task:', err);
      alert('Error al completar la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white p-4 rounded-lg border shadow-sm ${isCompleted ? 'border-green-200' : 'border-muted/50'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className={`text-sm font-semibold ${isCompleted ? 'text-green-800' : 'text-text-main'}`}>
          {tarea.titulo}
        </h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {isCompleted ? 'Completada' : 'Pendiente'}
        </span>
      </div>
      {tarea.descripcion && (
        <p className="text-xs text-secondary mb-3 bg-slate-50 p-2 rounded border border-slate-100">
          {tarea.descripcion}
        </p>
      )}
      
      {/* Timer UI */}
      <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
        <div className="flex items-center justify-between mb-1">
          <h5 className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Tiempo registrado</h5>
          {!isCompleted && (
            <button 
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-[10px] font-medium text-secondary hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Añadir manual
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-2">
          <button 
            onClick={handleToggleTimer}
            disabled={isCompleted || saving}
            className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
              isTimerRunning 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            } disabled:opacity-50`}
          >
            {isTimerRunning ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
          </button>
          <span className="text-sm font-mono font-medium text-text-main">{formatTime(totalSeconds)}</span>
        </div>

        {showManualInput && !isCompleted && (
          <form onSubmit={handleAddManualTime} className="flex items-end gap-2 mt-3 pt-3 border-t border-slate-200/60">
            <div>
              <label className="block text-[10px] font-medium text-secondary mb-1">Horas</label>
              <input 
                type="number" 
                min="0" 
                value={manualHours} 
                onChange={(e) => setManualHours(Number(e.target.value))}
                className="w-14 bg-white border border-muted rounded px-2 py-1 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-secondary mb-1">Minutos</label>
              <input 
                type="number" 
                min="0" 
                max="59"
                value={manualMinutes} 
                onChange={(e) => setManualMinutes(Number(e.target.value))}
                className="w-14 bg-white border border-muted rounded px-2 py-1 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={saving || (manualHours === 0 && manualMinutes === 0)}
              className="bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50 shadow-sm"
            >
              Guardar
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center text-slate-500">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>Vence: {tarea.fecha_vencimiento ? format(parseISO(tarea.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary-hover px-2 py-1 rounded-md font-medium">
            {tarea.rol_destino}
          </span>
          
          {!isCompleted && (
            <button
              onClick={handleCompleteTask}
              disabled={totalSeconds === 0 || saving}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors ${
                totalSeconds > 0 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title={totalSeconds === 0 ? "Debes registrar tiempo antes de completar la tarea" : "Marcar como completada"}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Completar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function EducacionContinua() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [selectedProyecto, setSelectedProyecto] = useState<string | null>(null);
  const [newProyectoName, setNewProyectoName] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTareas, setLoadingTareas] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProyectos();
  }, []);

  useEffect(() => {
    if (selectedProyecto) {
      fetchTareas(selectedProyecto);
    } else {
      setTareas([]);
    }
  }, [selectedProyecto]);

  const fetchProyectos = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('proyectos_ec')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Ignoramos el error 42P01 (relation does not exist) para no romper la UI si la tabla no existe aún
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

  const fetchTareas = async (proyectoNombre: string) => {
    try {
      setLoadingTareas(true);
      const { data, error } = await supabase
        .from('notificaciones_tareas')
        .select('*')
        .eq('proyecto', proyectoNombre)
        .order('fecha_vencimiento', { ascending: true });

      if (error) {
        if (error.code !== '42P01') throw error;
      } else {
        setTareas(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching tareas:', err);
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

      setProyectos(prev => [data, ...prev]);
      setNewProyectoName('');
      setSuccess('Proyecto agregado con éxito');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al agregar proyecto. Asegúrate de haber creado la tabla en Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Proyectos */}
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden flex flex-col">
          <div className="px-4 py-5 sm:px-6 border-b border-muted/30 bg-slate-100">
            <h3 className="text-lg leading-6 font-medium text-text-main flex items-center">
              <FolderKanban className="mr-2 h-5 w-5 text-primary" />
              Proyectos
            </h3>
            <p className="mt-1 text-xs text-secondary">
              Agrega los proyectos que se trabajarán en Educación Continua.
            </p>
          </div>
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
          <div className="flex-1 overflow-y-auto max-h-96 p-4">
            {loadingData ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 text-slate-400 animate-spin" /></div>
            ) : proyectos.length === 0 ? (
              <p className="text-sm text-secondary text-center py-4">No hay proyectos registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {proyectos.map(proyecto => (
                  <li 
                    key={proyecto.id} 
                    onClick={() => setSelectedProyecto(proyecto.nombre)}
                    className={`py-3 flex justify-between items-center px-3 rounded-md transition-colors cursor-pointer ${
                      selectedProyecto === proyecto.nombre ? 'bg-primary/10 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className={`text-sm font-medium ${selectedProyecto === proyecto.nombre ? 'text-primary' : 'text-text-main'}`}>
                      {proyecto.nombre}
                    </span>
                    <div className="flex items-center text-xs text-secondary">
                      <span className="mr-2">{new Date(proyecto.created_at).toLocaleDateString()}</span>
                      <ChevronRight className={`h-4 w-4 ${selectedProyecto === proyecto.nombre ? 'text-primary' : 'text-slate-300'}`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panel Tareas del Proyecto */}
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden flex flex-col">
          <div className="px-4 py-5 sm:px-6 border-b border-muted/30 bg-slate-100">
            <h3 className="text-lg leading-6 font-medium text-text-main flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Tareas del Proyecto
            </h3>
            <p className="mt-1 text-xs text-secondary">
              {selectedProyecto ? `Tareas asignadas a: ${selectedProyecto}` : 'Selecciona un proyecto para ver sus tareas.'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] p-4 bg-slate-50/50">
            {!selectedProyecto ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <FolderKanban className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-secondary">Selecciona un proyecto de la lista<br/>para ver sus tareas asociadas.</p>
              </div>
            ) : loadingTareas ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 text-slate-400 animate-spin" /></div>
            ) : tareas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-secondary">No hay tareas registradas para este proyecto.</p>
                <p className="text-xs text-slate-400 mt-1">Puedes agregar tareas desde el Calendario de Trabajo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tareas.map(tarea => (
                  <TareaTimerItem 
                    key={tarea.id} 
                    tarea={tarea} 
                    onUpdate={() => fetchTareas(selectedProyecto)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
