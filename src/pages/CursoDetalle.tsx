import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, PenTool, Bell, Loader2, Lightbulb, RefreshCw, Link as LinkIcon, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis, Legend } from 'recharts';

export default function CursoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [curso, setCurso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documentacion' | 'creacion' | 'novedades'>('creacion');
  
  // ClickUp states
  const [syncing, setSyncing] = useState(false);
  const [showClickupModal, setShowClickupModal] = useState(false);
  const [clickupListId, setClickupListId] = useState('');
  const [clickupUrl, setClickupUrl] = useState('');
  const [savingClickup, setSavingClickup] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCurso();
    }
  }, [id]);

  const fetchCurso = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name, email),
          evaluador:profiles!evaluador_id(name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCurso(data);
      if (data.clickup_list_id) {
        setClickupListId(data.clickup_list_id);
      }
      if (data.clickup_url) {
        setClickupUrl(data.clickup_url);
      }
    } catch (err) {
      console.error('Error fetching curso:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncClickUp = async () => {
    if (!curso?.clickup_list_id) return;
    
    try {
      setSyncing(true);
      const response = await fetch('/api/clickup/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ curso_id: curso.id, list_id: curso.clickup_list_id })
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar con ClickUp');
      }

      const data = await response.json();
      // Refetch course to get updated stats
      await fetchCurso();
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error al sincronizar con ClickUp. Verifica que el ID de la lista sea correcto y que la API Key esté configurada.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectClickUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSavingClickup(true);
      const { error } = await supabase
        .from('cursos')
        .update({
          clickup_list_id: clickupListId || null,
          clickup_url: clickupUrl || null
        })
        .eq('id', id);

      if (error) throw error;
      
      setShowClickupModal(false);
      await fetchCurso(); // Reload to get new data
      
      // If we just added a list ID, sync it immediately
      if (clickupListId) {
        // We need to use the new list ID directly since state might not be updated yet
        setSyncing(true);
        const response = await fetch('/api/clickup/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curso_id: id, list_id: clickupListId })
        });
        if (response.ok) {
          await fetchCurso();
        }
        setSyncing(false);
      }
      
    } catch (err) {
      console.error('Error updating ClickUp connection:', err);
      alert('Error al guardar la configuración de ClickUp');
      setSavingClickup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-slate-900">Curso no encontrado</h3>
        <button onClick={() => navigate('/cursos')} className="mt-4 text-indigo-600 hover:text-indigo-800">
          Volver a cursos
        </button>
      </div>
    );
  }

  // Data for the charts
  const generalProgress = curso.progreso || 0;
  const generalData = [
    { name: 'Completado', value: generalProgress },
    { name: 'Restante', value: 100 - generalProgress }
  ];

  const procesosColors: Record<string, string> = {
    'Documentación': '#00bfff', // Cyan
    'Grabación': '#ff3333',     // Red
    'Edición': '#99cc00',       // Green
    'Soporte': '#ffcc00',       // Yellow
  };

  const defaultProcesos = [
    { name: 'Soporte', value: 0, fill: '#ffcc00' },
    { name: 'Edición', value: 0, fill: '#99cc00' },
    { name: 'Grabación', value: 0, fill: '#ff3333' },
    { name: 'Documentación', value: 0, fill: '#00bfff' },
  ];

  const procesosData = defaultProcesos.map(dp => {
    const found = curso.clickup_stats?.procesos?.find((p: any) => p.name === dp.name);
    return {
      name: dp.name,
      value: found ? found.value : dp.value,
      fill: dp.fill
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/cursos')}
          className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{curso.nombre}</h1>
          <p className="text-sm text-slate-500">
            {curso.programa} • Docente: {curso.docente?.name || 'No asignado'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('documentacion')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'documentacion'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Documentación
          </button>
          <button
            onClick={() => setActiveTab('creacion')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'creacion'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <PenTool className="h-4 w-4 mr-2" />
            Creación
          </button>
          <button
            onClick={() => setActiveTab('novedades')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'novedades'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Bell className="h-4 w-4 mr-2" />
            Novedades
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'documentacion' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Documentación del Curso</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Aquí se alojarán los sílabos, guías didácticas, y recursos bibliográficos del curso.
            </p>
          </div>
        )}

        {activeTab === 'novedades' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Novedades y Actualizaciones</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Historial de cambios, notificaciones y comentarios sobre el progreso del curso.
            </p>
          </div>
        )}

        {activeTab === 'creacion' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center max-w-5xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900">Progreso de Creación</h2>
              <div className="flex space-x-3">
                {curso.clickup_list_id ? (
                  <button
                    onClick={handleSyncClickUp}
                    disabled={syncing}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {syncing ? 'Sincronizando...' : 'Sincronizar ClickUp'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowClickupModal(true)}
                    className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Conectar Tablero ClickUp
                  </button>
                )}
                {curso.clickup_list_id && (
                  <button
                    onClick={() => setShowClickupModal(true)}
                    className="flex items-center px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                    title="Configurar conexión"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#222631] rounded-2xl shadow-lg border border-slate-800 p-8 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column: Promedio General */}
                <div className="flex flex-col items-center justify-center relative">
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" cy="50%" 
                        innerRadius="80%" outerRadius="100%" 
                        barSize={15} 
                        data={[{ name: 'General', value: generalProgress, fill: '#00bfff' }]} 
                        startAngle={90} endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-5xl font-bold text-white">{generalProgress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-6 text-2xl font-bold text-slate-300 tracking-wider">
                    PROMEDIO GENERAL
                  </div>
                </div>

                {/* Right Column: Promedios específicos */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-slate-400 text-sm mb-2 font-medium tracking-widest uppercase">Promedios por Proceso</div>
                  <div className="w-full h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" cy="50%" 
                        innerRadius="30%" outerRadius="100%" 
                        barSize={12} 
                        data={procesosData} 
                        startAngle={90} endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e222d', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Progreso']}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center gap-8 mt-6 flex-wrap">
                    {[...procesosData].reverse().map((proceso, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart 
                              cx="50%" cy="50%" 
                              innerRadius="70%" outerRadius="100%" 
                              barSize={6} 
                              data={[{ name: proceso.name, value: proceso.value, fill: proceso.fill }]} 
                              startAngle={90} endAngle={-270}
                            >
                              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                              <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                            </RadialBarChart>
                          </ResponsiveContainer>
                          <span className="absolute text-sm font-bold text-white">{proceso.value.toFixed(0)}%</span>
                        </div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">{proceso.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Embedded ClickUp Board */}
            {curso.clickup_url && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-5xl mx-auto h-[600px]">
                <iframe 
                  src={curso.clickup_url} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }}
                  title="Tablero de ClickUp"
                  allow="clipboard-write"
                />
              </div>
            )}
          </div>
        )}
      </div>
      {/* ClickUp Connection Modal */}
      {showClickupModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Conectar con ClickUp</h3>
              <button onClick={() => setShowClickupModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleConnectClickUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">List ID de ClickUp</label>
                <input
                  type="text"
                  value={clickupListId}
                  onChange={(e) => setClickupListId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Ej. 90110123456"
                />
                <p className="text-xs text-slate-500 mt-1">
                  El ID numérico de la lista en ClickUp que contiene las tareas de este curso.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL Pública (Embed) Opcional</label>
                <input
                  type="url"
                  value={clickupUrl}
                  onChange={(e) => setClickupUrl(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://sharing.clickup.com/..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enlace público para incrustar el tablero directamente en la plataforma.
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowClickupModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingClickup}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 flex items-center"
                >
                  {savingClickup && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar y Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
