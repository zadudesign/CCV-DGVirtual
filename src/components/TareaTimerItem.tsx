import React, { useState } from 'react';
import { Plus, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { HOURLY_RATES } from '../lib/constants';

const COLOMBIA_TZ = 'America/Bogota';

interface TareaTimerItemProps {
  tarea: any;
  onUpdate: () => void | Promise<void>;
  customRates?: Record<string, number>;
}

export const TareaTimerItem: React.FC<TareaTimerItemProps> = ({ tarea, onUpdate, customRates }) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalSeconds = tarea.tiempo_invertido || 0;
  const isCompleted = tarea.estado === 'Completada' || tarea.estado === 'Completado';
  const hourlyRate = (customRates && customRates[tarea.tipo_tarea as string]) || HOURLY_RATES[tarea.tipo_tarea as string] || 0;
  const estimatedCost = (totalSeconds / 3600) * hourlyRate;

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
    if (totalSeconds === 0) return;
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
      
      {/* Time UI Compact */}
      <div className="mt-2.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-mono font-bold text-text-main">{formatTime(totalSeconds)}</span>
            <span className="text-[9px] font-bold text-secondary uppercase tracking-widest ml-1">Registrado</span>
          </div>
          <div className="flex items-center gap-2">
            {estimatedCost > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                ${estimatedCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
            )}
            {!isCompleted && (
              <button 
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-[10px] font-medium text-primary hover:text-primary-hover flex items-center gap-1 transition-colors bg-white px-2 py-0.5 rounded border border-muted/50 shadow-sm"
              >
                <Plus className="w-3 h-3" /> {showManualInput ? 'Cerrar' : 'Añadir'}
              </button>
            )}
          </div>
        </div>

        {showManualInput && !isCompleted && (
          <form onSubmit={handleAddManualTime} className="flex items-end gap-2 mt-2 pt-2 border-t border-slate-200/60">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-secondary mb-0.5 uppercase">Hrs</label>
                <input 
                  type="number" 
                  min="0" 
                  value={manualHours} 
                  onChange={(e) => setManualHours(Number(e.target.value))}
                  className="w-full bg-white border border-muted rounded px-1.5 py-1 text-xs text-text-main focus:outline-none focus:border-primary shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-secondary mb-0.5 uppercase">Min</label>
                <input 
                  type="number" 
                  min="0" 
                  max="59"
                  value={manualMinutes} 
                  onChange={(e) => setManualMinutes(Number(e.target.value))}
                  className="w-full bg-white border border-muted rounded px-1.5 py-1 text-xs text-text-main focus:outline-none focus:border-primary shadow-sm"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={saving || (manualHours === 0 && manualMinutes === 0)}
              className="bg-primary hover:bg-primary-hover text-white px-2.5 py-1 rounded text-xs font-bold disabled:opacity-50 shadow-sm"
            >
              Ok
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center text-slate-500">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>Vence: {tarea.fecha_vencimiento || tarea.fecha_entrega ? format(parseISO(tarea.fecha_vencimiento || tarea.fecha_entrega), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {tarea.tipo_tarea && (
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium">
              {tarea.tipo_tarea}
            </span>
          )}
          <span className="bg-primary/10 text-primary-hover px-2 py-1 rounded-md font-medium">
            {tarea.rol_destino || 'General'}
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
