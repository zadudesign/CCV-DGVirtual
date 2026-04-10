import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Loader2 } from 'lucide-react';
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
  
  const usuariosFiltrados = usuarios.filter(u => {
    const matchFacultad = filtroFacultad ? u.facultad === filtroFacultad : true;
    const matchPrograma = filtroPrograma ? u.programa === filtroPrograma : true;
    const matchRol = filtroRol ? u.role === filtroRol : true;
    return matchFacultad && matchPrograma && matchRol;
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Usuario
                </th>
                {isAdmin && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Documento
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Rol
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Facultad / Área
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Contacto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 text-center text-sm text-secondary">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 text-center text-sm text-secondary">
                    No hay usuarios registrados que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((user) => (
                  <tr key={user.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-hover font-bold">
                          {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-text-main">{user.name || 'Sin nombre'}</div>
                          <div className="text-sm text-secondary">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {user.documento || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'decano' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'coordinador' ? 'bg-green-100 text-green-800' :
                        user.role === 'docente' ? 'bg-yellow-100 text-yellow-800' :
                        ['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user.role) ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-text-main'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user.role) ? (
                        <div className="text-text-main font-medium">Equipo: {user.role === 'team' ? user.team_area : user.role}</div>
                      ) : user.facultad ? (
                        <>
                          <div className="text-text-main">{user.facultad}</div>
                          {user.programa && <div className="text-xs text-secondary">{user.programa}</div>}
                          
                          {/* Mostrar curso asignado para docentes y evaluadores */}
                          {(user.role === 'docente' || user.role === 'evaluador') && (
                            <div className="mt-2">
                              {cursos.filter(c => c.docente_id === user.id || c.evaluador_id === user.id).length > 0 ? (
                                cursos.filter(c => c.docente_id === user.id || c.evaluador_id === user.id).map(curso => (
                                  <div key={curso.id} className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded inline-block mt-1 mr-1">
                                    {curso.nombre} {curso.docente_id === user.id ? '(Docente)' : '(Evaluador)'}
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-400 italic mt-1">Sin curso asignado</div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {user.telefono || '-'}
                    </td>
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
