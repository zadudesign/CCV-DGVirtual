import React, { useState } from 'react';
import { Plus, Clock, CheckCircle, Bell, AlertCircle, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { HOURLY_RATES } from '../lib/constants';

const COLOMBIA_TZ = 'America/Bogota';

interface TareaTimerItemProps {
  tarea: any;
  onUpdate: () => void | Promise<void>;
  customRates?: Record<string, number>;
  hideType?: boolean;
  hideRole?: boolean;
}

export const TareaTimerItem: React.FC<TareaTimerItemProps> = ({ tarea, onUpdate, customRates, hideType, hideRole }) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalSeconds = tarea.tiempo_invertido || 0;
  const isCompleted = tarea.estado === 'Completada' || tarea.estado === 'Completado';
  
  // Solo habilitar registro de tiempo para Educación Continua y Diseño Virtual (tareas con proyecto definido)
  const isTimeTrackingEnabled = !!tarea.proyecto;

  // Priorizar tipo_tarifa
  const tarifaKey = tarea.tipo_tarifa;
  const hourlyRate = (customRates && customRates[tarifaKey as string]) || HOURLY_RATES[tarifaKey as string] || 0;
  const estimatedCost = (totalSeconds / 3600) * hourlyRate;

  const getTrafficLightStatus = (fecha: string, estado: string) => {
    if (estado === 'Completada' || estado === 'Completado') {
      return {
        color: 'bg-green-50 text-green-700 border-green-100',
        iconBg: 'bg-green-500',
        label: 'Completada',
        titleColor: 'text-green-700',
        icon: <CheckCircle2 className="h-4 w-4" />
      };
    }

    if (!fecha) return { 
      color: 'bg-yellow-50 text-yellow-700 border-yellow-100', 
      iconBg: 'bg-yellow-500', 
      label: 'En Progreso',
      titleColor: 'text-yellow-700',
      icon: <Clock className="h-4 w-4" />
    };

    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(fecha));
    const diffDays = differenceInDays(dueDate, today);

    if (diffDays < 0) {
      const daysLate = Math.abs(diffDays);
      return {
        color: 'bg-red-50 text-red-700 border-red-100',
        iconBg: 'bg-red-500',
        label: `Vencida (${daysLate} día${daysLate === 1 ? '' : 's'} de retraso)`,
        titleColor: 'text-red-700',
        icon: <AlertCircle className="h-4 w-4" />
      };
    } else {
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        iconBg: 'bg-yellow-500',
        label: 'En Progreso',
        titleColor: 'text-yellow-700',
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
  };

  const status = getTrafficLightStatus(tarea.fecha_vencimiento || tarea.fecha_entrega, tarea.estado);

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const saveTime = async (newTotalSeconds: number) => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('notificaciones_tareas')
        .update({ tiempo_invertido: newTotalSeconds })
        .eq('id', tarea.id)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No se pudo actualizar. Es probable que falten permisos de UPDATE en la base de datos.");
      }
      onUpdate();
    } catch (err: any) {
      console.error('Error saving time:', err);
      alert(`Error al guardar el tiempo: ${err.message || JSON.stringify(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddManualTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const addedSeconds = (manualHours * 3600) + (manualMinutes * 60);
    if (addedSeconds > 0) {
      await saveTime(totalSeconds + addedSeconds);
      setShowManualInput(false);
      setManualHours(0);
      setManualMinutes(0);
    }
  };

  const handleCompleteTask = async () => {
    if (isTimeTrackingEnabled && totalSeconds === 0) return;
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('notificaciones_tareas')
        .update({ 
          estado: 'Completada', 
          fecha_completada: formatInTimeZone(new Date(), COLOMBIA_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
          tiempo_invertido: totalSeconds
        })
        .eq('id', tarea.id)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No se pudo actualizar. Es probable que falten permisos de UPDATE en la base de datos.");
      }
      onUpdate();
    } catch (err: any) {
      console.error('Error completing task:', err);
      alert(`Error al completar la tarea: ${err.message || JSON.stringify(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${status.color}`}>
      <div className="flex justify-between items-start mb-1">
        <div className="min-w-0 pr-4">
          <h4 className={`text-base font-bold truncate leading-tight ${status.titleColor}`}>
            {tarea.titulo}
          </h4>
          <p className="text-xs opacity-80 truncate font-medium mt-0.5 text-secondary italic">
            {tarea.proyecto || (tarea.curso && tarea.curso.nombre) || 'Diseño Virtual'}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider bg-white/60 border border-black/5 ${status.titleColor}`}>
            {tarea.estado === 'Completada' || tarea.estado === 'Completado' ? 'Completado' : 'Pendiente'}
          </span>
        </div>
      </div>

      {tarea.descripcion && (
        <div className="mt-3 bg-white/80 rounded-xl p-3 text-xs border border-white flex items-start gap-2 shadow-sm">
          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${status.iconBg} shadow-sm`}>
             <Bell className="w-3 h-3 text-white" />
          </div>
          <span className="leading-snug text-slate-600 font-medium">{tarea.descripcion}</span>
        </div>
      )}
      
      {/* Time Tracking Section */}
      {isTimeTrackingEnabled && (
        <div className="mt-4 p-3 bg-white/60 border border-white rounded-xl shadow-inner backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-secondary uppercase tracking-widest leading-none mb-0.5 pointer-events-none">Tiempo Registrado</span>
                <span className="text-sm font-mono font-bold text-text-main leading-none">{formatTime(totalSeconds)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {estimatedCost > 0 && (
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter leading-none mb-0.5 pointer-events-none">Eco. Estimado</span>
                  <span className="text-xs font-bold text-emerald-600 leading-none">
                    ${estimatedCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {!isCompleted && (
                <button 
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-[10px] font-bold text-primary hover:bg-primary hover:text-white flex items-center gap-1 transition-all bg-white px-3 py-1.5 rounded-lg border border-primary/20 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> 
                  {showManualInput ? 'Cerrar' : 'Añadir'}
                </button>
              )}
            </div>
          </div>

          {showManualInput && !isCompleted && (
            <form onSubmit={handleAddManualTime} className="flex items-end gap-2 mt-3 pt-3 border-t border-slate-200/40">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 mb-1 uppercase tracking-tight">Horas</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={manualHours} 
                    onChange={(e) => setManualHours(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 mb-1 uppercase tracking-tight">Minutos</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="59"
                    value={manualMinutes} 
                    onChange={(e) => setManualMinutes(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={saving || (manualHours === 0 && manualMinutes === 0)}
                className="bg-primary hover:bg-primary-hover text-white h-[34px] px-4 rounded-lg text-xs font-bold disabled:opacity-50 shadow-md transform active:scale-95 transition-all"
              >
                Ok
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
        <div className="flex items-center text-secondary font-bold text-[11px]">
          <Calendar className="h-3.5 w-3.5 mr-1.5 opacity-60" />
          <span>{tarea.fecha_vencimiento || tarea.fecha_entrega ? format(parseISO(tarea.fecha_vencimiento || tarea.fecha_entrega), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!hideRole && (
            <span className="bg-slate-700 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm uppercase tracking-wider">
              {tarea.rol_destino || 'General'}
            </span>
          )}
          
          {!isCompleted && isTimeTrackingEnabled && (
            <button
              onClick={handleCompleteTask}
              disabled={saving || (isTimeTrackingEnabled && totalSeconds === 0)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm ${
                (!isTimeTrackingEnabled || totalSeconds > 0)
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
              }`}
              title={isTimeTrackingEnabled && totalSeconds === 0 ? "Debes registrar tiempo antes de completar la tarea" : "Marcar como completada"}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Listo
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-right">
        <span className={`text-[10px] font-bold italic opacity-80 ${status.titleColor}`}>
          {status.label}
        </span>
      </div>
    </div>
  );
};
