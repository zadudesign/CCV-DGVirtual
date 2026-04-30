import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Loader2, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  UserPlus, 
  Library, 
  Mail, 
  IdCard, 
  Phone, 
  Shield,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User, Role } from '../types';

export default function Usuarios() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'registrados' | 'inscribir' | 'facultades'>('registrados');
  
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [facultades, setFacultades] = useState<any[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de la lista
  const [filtroFacultad, setFiltroFacultad] = useState<string>('');
  const [filtroPrograma, setFiltroPrograma] = useState<string>('');
  const [filtroRol, setFiltroRol] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User | 'last_access', direction: 'asc' | 'desc' }>({ 
    key: 'last_access', 
    direction: 'desc' 
  });

  // Inscribir Form State
  const [formInscribir, setFormInscribir] = useState({
    nombre: '',
    email: '',
    role: 'docente' as Role,
    documento: '',
    telefono: '',
    facultad: '',
    programa: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Facultades/Programas State
  const [newFacultad, setNewFacultad] = useState('');
  const [newPrograma, setNewPrograma] = useState('');
  const [selectedFacultadId, setSelectedFacultadId] = useState('');
  const [editingFacultadId, setEditingFacultadId] = useState<string | null>(null);
  const [editingFacultadNombre, setEditingFacultadNombre] = useState('');
  const [editingProgramaId, setEditingProgramaId] = useState<string | null>(null);
  const [editingProgramaNombre, setEditingProgramaNombre] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      let query = supabase.from('profiles').select('*').order('name');
      
      if (user?.role === 'decano' && user.facultad) {
        query = query.eq('facultad', user.facultad);
      } else if (user?.role === 'coordinador' && user.programa) {
        query = query.eq('programa', user.programa);
      }
      
      const { data: usersData, error: usersError } = await query;
      if (usersError) throw usersError;
      
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select('id, nombre, docente_id, evaluador_id');
      if (cursosError) throw cursosError;
      
      setUsuarios((usersData as User[]) || []);
      setCursos(cursosData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacultadesYProgramas = async () => {
    try {
      const { data: fData } = await supabase.from('facultades').select('*').order('nombre');
      const { data: pData } = await supabase.from('programas').select('*, facultades(nombre)').order('nombre');
      setFacultades(fData || []);
      setProgramas(pData || []);
    } catch (err) {
      console.error('Error fetching facultades/programas:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
      fetchFacultadesYProgramas();
    }
  }, [user]);

  const handleSort = (key: keyof User | 'last_access') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-1 h-3 w-3 text-primary" /> : <ChevronDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const formatearFecha = (fechaStr?: string) => {
    if (!fechaStr) return '-';
    return new Date(fechaStr).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getDiasDesdeUltimoAcceso = (fechaStr?: string) => {
    if (!fechaStr) return null;
    const fechaAcceso = new Date(fechaStr);
    const hoy = new Date();
    fechaAcceso.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    const diferenciaMs = hoy.getTime() - fechaAcceso.getTime();
    return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
  };

  const handleInscribir = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('profiles').insert([{
        id: crypto.randomUUID(), 
        name: formInscribir.nombre,
        email: formInscribir.email,
        role: formInscribir.role,
        documento: formInscribir.documento,
        telefono: formInscribir.telefono,
        facultad: formInscribir.facultad || null,
        programa: formInscribir.programa || null
      }]);
      if (error) throw error;
      alert('Usuario inscrito correctamente.');
      setFormInscribir({
        nombre: '', email: '', role: 'docente', documento: '',
        telefono: '', facultad: '', programa: ''
      });
      fetchData();
      setActiveTab('registrados');
    } catch (err: any) {
      alert('Error al inscribir usuario: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFacultad = async () => {
    if (!newFacultad.trim()) return;
    const { error } = await supabase.from('facultades').insert([{ nombre: newFacultad }]);
    if (!error) { setNewFacultad(''); fetchFacultadesYProgramas(); }
  };

  const handleDeleteFacultad = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que quieres eliminar la facultad "${nombre}"?`)) return;
    const { error } = await supabase.from('facultades').delete().eq('id', id);
    if (!error) fetchFacultadesYProgramas();
  };

  const handleAddPrograma = async () => {
    if (!newPrograma.trim() || !selectedFacultadId) return;
    const { error } = await supabase.from('programas').insert([{ nombre: newPrograma, facultad_id: selectedFacultadId }]);
    if (!error) { setNewPrograma(''); fetchFacultadesYProgramas(); }
  };

  const handleDeletePrograma = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que quieres eliminar el programa "${nombre}"?`)) return;
    const { error } = await supabase.from('programas').delete().eq('id', id);
    if (!error) fetchFacultadesYProgramas();
  };

  const getFilteredOptions = (field: 'facultad' | 'programa' | 'role') => {
    return Array.from(new Set(usuarios.filter(u => {
      let match = true;
      if (field !== 'facultad' && filtroFacultad && u.facultad !== filtroFacultad) match = false;
      if (field !== 'programa' && filtroPrograma && u.programa !== filtroPrograma) match = false;
      if (field !== 'role' && filtroRol && u.role !== filtroRol) match = false;
      return match;
    }).map(u => u[field]).filter(Boolean))).sort() as string[];
  };

  const facultadesUnicas = getFilteredOptions('facultad');
  const programasUnicos = getFilteredOptions('programa');
  const rolesUnicos = getFilteredOptions('role');

  useEffect(() => {
    if (filtroFacultad && !facultadesUnicas.includes(filtroFacultad)) setFiltroFacultad('');
    if (filtroPrograma && !programasUnicos.includes(filtroPrograma)) setFiltroPrograma('');
    if (filtroRol && !rolesUnicos.includes(filtroRol)) setFiltroRol('');
  }, [filtroFacultad, facultadesUnicas, filtroPrograma, programasUnicos, filtroRol, rolesUnicos]);
  
  const usuariosFiltrados = usuarios
    .filter(u => {
      const matchFacultad = filtroFacultad ? u.facultad === filtroFacultad : true;
      const matchPrograma = filtroPrograma ? u.programa === filtroPrograma : true;
      const matchRol = filtroRol ? u.role === filtroRol : true;
      return matchFacultad && matchPrograma && matchRol;
    })
    .sort((a, b) => {
      const key = sortConfig.key;
      const valA = a[key as keyof User] || '';
      const valB = b[key as keyof User] || '';
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex border-b border-muted/30 -mb-px relative top-[1px]">
        <button
          onClick={() => setActiveTab('registrados')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
            activeTab === 'registrados'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
          }`}
        >
          <UsersIcon className={`mr-2 h-4 w-4 ${activeTab === 'registrados' ? 'text-primary' : 'text-slate-400'}`} />
          Usuarios Registrados
        </button>
        <button
          onClick={() => setActiveTab('inscribir')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
            activeTab === 'inscribir'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
          }`}
        >
          <UserPlus className={`mr-2 h-4 w-4 ${activeTab === 'inscribir' ? 'text-primary' : 'text-slate-400'}`} />
          Inscribir Usuarios
        </button>
        <button
          onClick={() => setActiveTab('facultades')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
            activeTab === 'facultades'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
          }`}
        >
          <Library className={`mr-2 h-4 w-4 ${activeTab === 'facultades' ? 'text-primary' : 'text-slate-400'}`} />
          Facultades y Programas
        </button>
      </div>
      
      {/* Espaciador explícito solicitado por el usuario */}
      <div className="h-4"></div>

      {activeTab === 'registrados' && (
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-muted/30">
            <div className="flex flex-wrap gap-4 w-full bg-white p-4 rounded-xl border border-muted/20 shadow-sm">
              {facultadesUnicas.length > 1 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5 ml-1">Filtrar por Facultad:</label>
                  <select value={filtroFacultad} onChange={(e) => setFiltroFacultad(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                    <option value="">Todas las facultades</option>
                    {facultadesUnicas.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
              {programasUnicos.length > 1 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5 ml-1">Filtrar por Programa:</label>
                  <select value={filtroPrograma} onChange={(e) => setFiltroPrograma(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                    <option value="">Todos los programas</option>
                    {programasUnicos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              {rolesUnicos.length > 1 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5 ml-1">Filtrar por Rol:</label>
                  <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                    <option value="">Todos los roles</option>
                    {rolesUnicos.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              {(filtroFacultad || filtroPrograma || filtroRol) && (
                <button 
                  onClick={() => { setFiltroFacultad(''); setFiltroPrograma(''); setFiltroRol(''); }}
                  className="self-end px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-100 mb-[2px]"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>Perfil y Contacto {getSortIcon('name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('role')}>Rol y Ubicación {getSortIcon('role')}</th>
                  {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('last_access')}>Actividad {getSortIcon('last_access')}</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (<tr><td colSpan={isAdmin?3:2} className="py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></td></tr>) : 
                usuariosFiltrados.length === 0 ? (<tr><td colSpan={isAdmin?3:2} className="py-8 text-center text-sm text-secondary">No hay usuarios.</td></tr>) :
                usuariosFiltrados.map(user => (
                  <tr key={user.id} className="hover:bg-background">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
                          {user.photoURL ? <img src={user.photoURL} className="h-full w-full object-cover" /> : user.name?.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-text-main leading-tight">{user.name}</div>
                          <div className="text-[11px] text-secondary mt-0.5">{user.email}</div>
                          {isAdmin && (
                            <div className="mt-1.5 flex flex-col space-y-0.5">
                              <div className="flex items-center text-[10px] text-slate-500">
                                <IdCard className="h-3 w-3 mr-1" /> {user.documento || 'Sin doc.'}
                              </div>
                              <div className="flex items-center text-[10px] text-slate-500">
                                <Phone className="h-3 w-3 mr-1" /> {user.telefono || 'Sin tel.'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-blue-50 text-blue-700 border border-blue-100">{user.role}</span>
                          </div>
                          <div className="text-[11px] text-secondary font-medium">{user.facultad} {user.programa && `• ${user.programa}`}</div>
                          
                          {/* Cursos Asignados */}
                          {(user.role === 'docente' || user.role === 'evaluador') && (
                            <div className="pt-1">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Cursos asignados:</div>
                              <div className="flex flex-wrap gap-1">
                                {cursos
                                  .filter(c => (user.role === 'docente' && c.docente_id === user.id) || (user.role === 'evaluador' && c.evaluador_id === user.id))
                                  .map(c => (
                                    <span key={c.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                      {c.nombre}
                                    </span>
                                  ))
                                }
                                {cursos.filter(c => (user.role === 'docente' && c.docente_id === user.id) || (user.role === 'evaluador' && c.evaluador_id === user.id)).length === 0 && (
                                  <span className="text-[10px] italic text-slate-400">Ninguno</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-xs font-medium text-text-main">
                          {user.last_access ? (
                            new Date(user.last_access).toLocaleDateString('es-ES', { 
                              day: '2-digit', month: 'short', year: 'numeric' 
                            }) + ' ' + new Date(user.last_access).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', minute: '2-digit', hour12: true 
                            })
                          ) : '-'}
                        </div>
                        {user.last_access && (
                          <div className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-tighter border ${
                            (getDiasDesdeUltimoAcceso(user.last_access) || 0) > 30 
                              ? 'bg-red-50 text-red-600 border-red-100' :
                            (getDiasDesdeUltimoAcceso(user.last_access) || 0) > 7 
                              ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-green-50 text-green-700 border-green-100'
                          }`}>
                            {getDiasDesdeUltimoAcceso(user.last_access) === 0 ? (
                              <><span className="mr-1">●</span> Activo hoy</>
                            ) : (
                              `Hace ${getDiasDesdeUltimoAcceso(user.last_access)} días`
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inscribir' && (
        <div className="bg-white shadow-xl rounded-2xl border border-muted/30 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleInscribir} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-text-main mb-2">Rol a inscribir</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Shield className="h-5 w-5 text-slate-400" /></div>
                    <select required value={formInscribir.role} onChange={(e) => setFormInscribir({...formInscribir, role: e.target.value as Role})} className="block w-full pl-10 pr-3 py-2.5 border border-muted rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary sm:text-sm">
                      <option value="docente">Docente</option><option value="evaluador">Par Evaluador</option><option value="coordinador">Coordinador</option><option value="decano">Decano</option><option value="admin">Administrador</option><option value="Diseño">Equipo - Diseño</option><option value="Multimedia">Equipo - Multimedia</option><option value="Pedagogía">Equipo - Pedagogía</option><option value="Soporte">Equipo - Soporte</option>
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-text-main mb-2">Nombre Completo</label>
                  <input type="text" required value={formInscribir.nombre} onChange={(e) => setFormInscribir({...formInscribir, nombre: e.target.value})} className="block w-full px-4 py-2.5 border border-muted rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary sm:text-sm" placeholder="Ej. Juan Pérez" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-2">Correo Institucional</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                    <input type="email" required value={formInscribir.email} onChange={(e) => setFormInscribir({...formInscribir, email: e.target.value})} className="block w-full pl-10 pr-3 py-2.5 border border-muted rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary sm:text-sm" placeholder="juan.perez@universidad.edu" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-2">Número de Documento</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IdCard className="h-5 w-5 text-slate-400" /></div>
                    <input type="text" required value={formInscribir.documento} onChange={(e) => setFormInscribir({...formInscribir, documento: e.target.value})} className="block w-full pl-10 pr-3 py-2.5 border border-muted rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary sm:text-sm" placeholder="Ej. 1020304050" />
                  </div>
                  <p className="mt-1 text-[11px] text-primary font-medium">Este número será usado como contraseña inicial.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-main mb-2">Número de Contacto</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-slate-400" /></div>
                    <input type="tel" value={formInscribir.telefono} onChange={(e) => setFormInscribir({...formInscribir, telefono: e.target.value})} className="block w-full pl-10 pr-3 py-2.5 border border-muted rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary sm:text-sm" placeholder="Ej. 3001234567" />
                  </div>
                </div>
                {['decano','coordinador','docente','evaluador'].includes(formInscribir.role) && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-text-main mb-2">Facultad</label>
                      <select required value={formInscribir.facultad} onChange={(e) => setFormInscribir({...formInscribir, facultad: e.target.value})} className="block w-full px-3 py-2.5 border border-muted rounded-xl bg-white focus:ring-2 focus:ring-primary sm:text-sm">
                        <option value="">Seleccione Facultad</option>
                        {facultades.map(f => (<option key={f.id} value={f.nombre}>{f.nombre}</option>))}
                      </select>
                    </div>
                    {formInscribir.role !== 'decano' && (
                      <div>
                        <label className="block text-sm font-semibold text-text-main mb-2">Programa</label>
                        <select required value={formInscribir.programa} onChange={(e) => setFormInscribir({...formInscribir, programa: e.target.value})} className="block w-full px-3 py-2.5 border border-muted rounded-xl bg-white focus:ring-2 focus:ring-primary sm:text-sm">
                          <option value="">Seleccione Programa</option>
                          {programas.filter(p => !formInscribir.facultad || p.facultades?.nombre === formInscribir.facultad).map(p => (<option key={p.id} value={p.nombre}>{p.nombre}</option>))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="pt-4">
                <button type="submit" disabled={submitting} className="w-full flex justify-center items-center px-4 py-3 bg-primary text-white rounded-xl shadow-lg hover:bg-primary-hover disabled:opacity-50">
                  {submitting ? <><Loader2 className="animate-spin h-5 w-5 mr-3" /> Inscribiendo...</> : <><UserPlus className="h-5 w-5 mr-3" /> Inscribir Nuevo Usuario</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'facultades' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda: Facultades */}
          <div className="bg-white shadow rounded-xl overflow-hidden border border-muted/30 flex flex-col h-[600px]">
            <div className="px-6 py-4 bg-slate-50 border-b border-muted/30 font-bold flex items-center shrink-0">
              <Library className="mr-2 h-5 w-5 text-primary" /> 
              <div>
                <h3 className="text-lg font-bold text-text-main">Facultades</h3>
                <p className="text-xs text-secondary mt-0.5 font-normal">Agrega las facultades de la institución.</p>
              </div>
            </div>
            <div className="p-4 shrink-0 border-b border-muted/20">
              <div className="flex bg-slate-50 p-2 rounded-xl border border-slate-100">
                <input 
                  type="text" 
                  value={newFacultad} 
                  onChange={e => setNewFacultad(e.target.value)} 
                  className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 font-medium" 
                  placeholder="Nombre de la nueva facultad..." 
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddFacultad();
                  }}
                />
                <button 
                  onClick={handleAddFacultad} 
                  className="bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                >
                  <Plus className="h-5 w-5"/>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {facultades.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setSelectedFacultadId(f.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                    selectedFacultadId === f.id
                      ? 'bg-slate-50 border-primary/30 ring-1 ring-primary/20 scale-[1.02] shadow-sm' 
                      : 'bg-white border-muted/20 hover:border-primary/20 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center flex-1 min-w-0 pr-4">
                    <span className="text-sm font-bold text-slate-700 truncate">{f.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-colors ${
                      selectedFacultadId === f.id ? 'text-primary' : 'text-slate-300 group-hover:text-primary/50'
                    }`} />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFacultad(f.id, f.nombre);
                      }} 
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        selectedFacultadId === f.id ? 'hover:bg-red-100' : 'hover:bg-red-50'
                      }`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
              {facultades.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Library className="h-12 w-12 text-slate-200 mb-3" />
                  <p className="text-sm text-secondary">No hay facultades registradas.</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Programas */}
          <div className="bg-white shadow rounded-xl overflow-hidden border border-muted/30 flex flex-col h-[600px]">
            <div className="px-6 py-4 bg-slate-50 border-b border-muted/30 font-bold flex items-center justify-between shrink-0">
              <div className="flex items-center">
                <UsersIcon className="mr-2 h-5 w-5 text-primary" /> 
                <div>
                  <h3 className="text-lg font-bold text-text-main">Programas de la Facultad</h3>
                  {selectedFacultadId ? (
                    <p className="text-xs text-secondary mt-0.5 font-normal">
                      Mostrando programas de: <span className="font-bold text-slate-700">{facultades.find(f => f.id === selectedFacultadId)?.nombre}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-secondary mt-0.5 font-normal">Selecciona una facultad para ver sus programas.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50/30">
              {!selectedFacultadId ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 p-6">
                  <Library className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-sm text-secondary">Selecciona una facultad de la lista<br/>para ver y gestionar sus programas.</p>
                </div>
              ) : (
                <div className="p-4 flex flex-col h-full">
                  <div className="shrink-0 mb-4">
                    <div className="flex bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      <input 
                        type="text" 
                        value={newPrograma} 
                        onChange={e => setNewPrograma(e.target.value)} 
                        className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 font-medium" 
                        placeholder="Nombre del nuevo programa..." 
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddPrograma();
                        }}
                      />
                      <button 
                        onClick={handleAddPrograma} 
                        className="bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                      >
                        <Plus className="h-5 w-5"/>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {programas.filter(p => p.facultad_id === selectedFacultadId).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-primary/30 transition-colors shadow-sm group">
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="text-sm font-bold text-slate-700 truncate">{p.nombre}</div>
                        </div>
                        <button 
                          onClick={() => handleDeletePrograma(p.id, p.nombre)} 
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600"/>
                        </button>
                      </div>
                    ))}
                    {programas.filter(p => p.facultad_id === selectedFacultadId).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-white/50 rounded-xl border border-dashed border-slate-200">
                        <UsersIcon className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-secondary">No hay programas registrados<br/>en esta facultad.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
