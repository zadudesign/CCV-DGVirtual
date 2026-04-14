import React, { useState, useEffect } from 'react';
import { GraduationCap, FolderKanban, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function EducacionContinua() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [newProyectoName, setNewProyectoName] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProyectos();
  }, []);

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
                  <li key={proyecto.id} className="py-3 flex justify-between items-center hover:bg-slate-50 px-2 rounded-md transition-colors">
                    <span className="text-sm font-medium text-text-main">{proyecto.nombre}</span>
                    <span className="text-xs text-secondary">
                      {new Date(proyecto.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
