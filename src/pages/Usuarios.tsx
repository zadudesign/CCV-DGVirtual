import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

export default function Usuarios() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFacultad, setFiltroFacultad] = useState<string>('');
  const [filtroPrograma, setFiltroPrograma] = useState<string>('');
  const [filtroRol, setFiltroRol] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User | 'last_access', direction: 'asc' | 'desc' }>({ 
    key: 'last_access', 
    direction: 'desc' 
  });

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

  const getDiasDesdeUltimoAcceso = (fechaStr?: string) => {
    if (!fechaStr) return null;
    const fechaAcceso = new Date(fechaStr);
    const hoy = new Date();
    
    // Resetear horas para comparar solo días
    fechaAcceso.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    
    const diferenciaMs = hoy.getTime() - fechaAcceso.getTime();
    const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    
    return diferenciaDias;
  };

  const formatearFecha = (fechaStr?: string) => {
    if (!fechaStr) return '-';
    return new Date(fechaStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch usuarios
      let query = supabase.from('profiles').select('*').order('name');
      
      // Filtro automático según el rol del usuario actual
      if (user?.role === 'decano' && user.facultad) {
        query = query.eq('facultad', user.facultad);
      } else if (user?.role === 'coordinador' && user.programa) {
        query = query.eq('programa', user.programa);
      }
      
      const { data: usersData, error: usersError } = await query;
      if (usersError) throw usersError;
      
      // Fetch cursos to map them to docentes and evaluadores
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

  const facultadesUnicas = Array.from(new Set(usuarios.map(u => u.facultad).filter(Boolean))).sort() as string[];
  const programasUnicos = Array.from(new Set(usuarios.map(u => u.programa).filter(Boolean))).sort() as string[];
  const rolesUnicos = Array.from(new Set(usuarios.map(u => u.role).filter(Boolean))).sort() as string[];
  
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
      <div>
        <h1 className="text-2xl font-bold text-text-main">Gestión de Usuarios</h1>
        <p className="mt-1 text-sm text-secondary">
          Lista de todos los usuarios inscritos en la plataforma.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-muted/30 bg-slate-100 flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-text-main flex items-center">
              <UsersIcon className="mr-2 h-5 w-5 text-primary" />
              Usuarios Registrados
            </h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            {facultadesUnicas.length > 1 && (
              <div className="flex-1">
                <label htmlFor="facultad-filter" className="block text-xs font-medium text-text-main mb-1">
                  Facultad:
                </label>
                <select
                  id="facultad-filter"
                  value={filtroFacultad}
                  onChange={(e) => setFiltroFacultad(e.target.value)}
                  className="block w-full rounded-md border border-muted px-3 py-1.5 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Todas las facultades</option>
                  {facultadesUnicas.map(facultad => (
                    <option key={facultad} value={facultad}>{facultad}</option>
                  ))}
                </select>
              </div>
            )}

            {programasUnicos.length > 1 && (
              <div className="flex-1">
                <label htmlFor="programa-filter" className="block text-xs font-medium text-text-main mb-1">
                  Programa:
                </label>
                <select
                  id="programa-filter"
                  value={filtroPrograma}
                  onChange={(e) => setFiltroPrograma(e.target.value)}
                  className="block w-full rounded-md border border-muted px-3 py-1.5 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Todos los programas</option>
                  {programasUnicos.map(programa => (
                    <option key={programa} value={programa}>{programa}</option>
                  ))}
                </select>
              </div>
            )}

            {rolesUnicos.length > 1 && (
              <div className="flex-1">
                <label htmlFor="rol-filter" className="block text-xs font-medium text-text-main mb-1">
                  Rol:
                </label>
                <select
                  id="rol-filter"
                  value={filtroRol}
                  onChange={(e) => setFiltroRol(e.target.value)}
                  className="block w-full rounded-md border border-muted px-3 py-1.5 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Todos los roles</option>
                  {rolesUnicos.map(rol => (
                    <option key={rol} value={rol}>{rol}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-background">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Perfil y Contacto
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center">
                    Rol y Ubicación
                    {getSortIcon('role')}
                  </div>
                </th>
                {isAdmin && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleSort('last_access')}
                  >
                    <div className="flex items-center">
                      Actividad
                      {getSortIcon('last_access')}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 3 : 2} className="px-6 py-4 text-center text-sm text-secondary">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 3 : 2} className="px-6 py-4 text-center text-sm text-secondary">
                    No hay usuarios registrados que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((user) => (
                  <tr key={user.id} className="hover:bg-background group">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center text-primary-hover font-bold overflow-hidden mt-1">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            user.name?.charAt(0) || user.email?.charAt(0) || '?'
                          )}
                        </div>
                        <div className="ml-4 space-y-0.5">
                          <div className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">{user.name || 'Sin nombre'}</div>
                          <div className="text-xs text-secondary leading-none">{user.email}</div>
                          {isAdmin && (
                            <div className="flex items-center gap-3 pt-1">
                              {user.documento && (
                                <div className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                  DOC: {user.documento}
                                </div>
                              )}
                              {user.telefono && (
                                <div className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                  TEL: {user.telefono}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold uppercase tracking-widest rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'decano' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'coordinador' ? 'bg-green-100 text-green-800' :
                          user.role === 'docente' ? 'bg-yellow-100 text-yellow-800' :
                          user.role === 'Soporte' ? 'bg-orange-100 text-orange-800' :
                          user.role === 'Multimedia' ? 'bg-indigo-100 text-indigo-800' :
                          user.role === 'Diseño' ? 'bg-pink-100 text-pink-800' :
                          user.role === 'Pedagogía' ? 'bg-cyan-100 text-cyan-800' :
                          'bg-slate-100 text-text-main'
                        }`}>
                          {user.role}
                        </span>
                        
                        <div className="text-xs leading-tight">
                          {['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user.role) ? (
                            <div className="text-secondary italic">Equipo: {user.role === 'team' ? user.team_area : user.role}</div>
                          ) : user.facultad ? (
                            <div>
                              <div className="text-text-main font-semibold truncate max-w-[200px]" title={user.facultad}>{user.facultad}</div>
                              {user.programa && <div className="text-secondary truncate max-w-[180px]" title={user.programa}>{user.programa}</div>}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No asignado</span>
                          )}
                        </div>

                        {/* Cursos asignados en miniatura */}
                        {(user.role === 'docente' || user.role === 'evaluador') && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cursos.filter(c => c.docente_id === user.id || c.evaluador_id === user.id).map(curso => (
                              <div key={curso.id} className="text-[9px] font-bold text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                {curso.nombre}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-xs font-medium text-text-main">{formatearFecha(user.last_access)}</div>
                        {user.last_access && (
                           <div className={`text-[10px] font-extrabold mt-1.5 uppercase tracking-tighter inline-block px-2 py-0.5 rounded-sm ${
                             (getDiasDesdeUltimoAcceso(user.last_access) || 0) > 30 ? 'bg-red-50 text-red-600 border border-red-100' :
                             (getDiasDesdeUltimoAcceso(user.last_access) || 0) > 7 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                             'bg-green-50 text-green-700 border border-green-100'
                           }`}>
                             {getDiasDesdeUltimoAcceso(user.last_access) === 0 
                               ? '● Activo hoy' 
                               : `Hace ${getDiasDesdeUltimoAcceso(user.last_access)} días`}
                           </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
