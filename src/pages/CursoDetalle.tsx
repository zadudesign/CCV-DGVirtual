import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, PenTool, Bell, Loader2, Lightbulb } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function CursoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [curso, setCurso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documentacion' | 'creacion' | 'novedades'>('creacion');

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
    } catch (err) {
      console.error('Error fetching curso:', err);
    } finally {
      setLoading(false);
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

  // Mock data for the charts based on the image provided
  const generalProgress = curso.progreso || 43.1;
  const generalData = [
    { name: 'Completado', value: generalProgress },
    { name: 'Restante', value: 100 - generalProgress }
  ];

  const procesosData = [
    { name: 'Documentación', value: 26.1, color: '#3b82f6' }, // blue-500
    { name: 'Grabación', value: 100, color: '#f97316' }, // orange-500
    { name: 'Edición', value: 37.4, color: '#8b5cf6' }, // violet-500
  ];

  const unidadesData = [
    { name: 'Unidad 1', data: [{ name: 'A', value: 45, color: '#f97316' }, { name: 'B', value: 27, color: '#3b82f6' }, { name: 'C', value: 27, color: '#8b5cf6' }], total: 31.4 },
    { name: 'Unidad 2', data: [{ name: 'A', value: 62, color: '#f97316' }, { name: 'B', value: 38, color: '#3b82f6' }], total: 22.9 },
    { name: 'Unidad 3', data: [{ name: 'A', value: 62, color: '#f97316' }, { name: 'B', value: 38, color: '#3b82f6' }], total: 22.9 },
    { name: 'Unidad 4', data: [{ name: 'A', value: 62, color: '#f97316' }, { name: 'B', value: 38, color: '#3b82f6' }], total: 22.9 },
    { name: 'Unidad 5', data: [{ name: 'A', value: 14, color: '#f97316' }, { name: 'B', value: 43, color: '#3b82f6' }, { name: 'C', value: 43, color: '#8b5cf6' }], total: 100.0 },
  ];

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
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 border border-slate-200">
              En la sección <strong>CREACIÓN</strong> encontrará el promedio de progreso, tanto general como específico, de los distintos procesos involucrados en la creación de un curso virtual, tales como la documentación, la grabación y la edición.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Promedio General */}
              <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    PROMEDIO GENERAL
                  </span>
                </div>
                
                <div className="relative w-64 h-64 mt-8 flex items-center justify-center">
                  {/* Lightbulb background shape (simplified) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <Lightbulb className="w-full h-full text-yellow-500" />
                  </div>
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={generalData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#dc2626" /> {/* red-600 */}
                        <Cell fill="#e2e8f0" /> {/* slate-200 */}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-slate-700">{generalProgress.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Promedios específicos */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Promedio por proceso */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-bold bg-green-700 text-white border-2 border-green-200">
                      PROMEDIO POR PROCESO
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {procesosData.map((proceso, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="w-full h-32 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Done', value: proceso.value },
                                  { name: 'Left', value: 100 - proceso.value }
                                ]}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                stroke="none"
                              >
                                <Cell fill={proceso.color} />
                                <Cell fill="#f1f5f9" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                            <span className="text-2xl font-bold text-slate-700">{proceso.value.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: proceso.color }}></div>
                          <span className="text-sm font-medium text-slate-600 uppercase tracking-wider">{proceso.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promedio por unidad */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-bold bg-green-700 text-white border-2 border-green-200">
                      PROMEDIO POR UNIDAD
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {unidadesData.map((unidad, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="w-24 h-24 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={unidad.data}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={45}
                                dataKey="value"
                                stroke="none"
                              >
                                {unidad.data.map((entry, i) => (
                                  <Cell key={`cell-${i}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-700">{unidad.total.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-2 bg-slate-100 px-3 py-1 rounded-full w-full text-center">
                          <span className="text-xs font-medium text-slate-600 uppercase">{unidad.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
