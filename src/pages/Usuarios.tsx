import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Loader2, Trash2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

export default function Usuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFacultad, setFiltroFacultad] = useState<string>('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      
      // Call our backend API to delete from both auth.users and public.profiles
      const response = await fetch(`/api/admin/users/${userToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el usuario');
      }
      
      setUsuarios(usuarios.filter(u => u.id !== userToDelete));
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Hubo un error al eliminar el usuario. Por favor intenta de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

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
  const usuariosFiltrados = usuarios.filter(u => filtroFacultad ? u.facultad === filtroFacultad : true);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lista de todos los usuarios inscritos en la plataforma.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h3 className="text-lg leading-6 font-medium text-slate-900 flex items-center">
            <UsersIcon className="mr-2 h-5 w-5 text-indigo-600" />
            Usuarios Registrados
          </h3>
          
          {facultadesUnicas.length > 1 && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label htmlFor="facultad-filter" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Facultad:
              </label>
              <select
                id="facultad-filter"
                value={filtroFacultad}
                onChange={(e) => setFiltroFacultad(e.target.value)}
                className="block w-full sm:w-64 rounded-md border border-slate-300 px-3 py-1.5 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Todas las facultades</option>
                {facultadesUnicas.map(facultad => (
                  <option key={facultad} value={facultad}>{facultad}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rol
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Facultad / Área
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                    No hay usuarios registrados{filtroFacultad ? ' en esta facultad' : ''}.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{user.name || 'Sin nombre'}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'decano' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'coordinador' ? 'bg-green-100 text-green-800' :
                        user.role === 'docente' ? 'bg-yellow-100 text-yellow-800' :
                        user.role === 'team' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.role === 'team' && user.team_area ? (
                        <div className="text-slate-900 font-medium">Equipo: {user.team_area}</div>
                      ) : user.facultad ? (
                        <>
                          <div className="text-slate-900">{user.facultad}</div>
                          {user.programa && <div className="text-xs text-slate-500">{user.programa}</div>}
                          
                          {/* Mostrar curso asignado para docentes y evaluadores */}
                          {(user.role === 'docente' || user.role === 'evaluador') && (
                            <div className="mt-2">
                              {cursos.filter(c => c.docente_id === user.id || c.evaluador_id === user.id).length > 0 ? (
                                cursos.filter(c => c.docente_id === user.id || c.evaluador_id === user.id).map(curso => (
                                  <div key={curso.id} className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block mt-1 mr-1">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.telefono || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setUserToDelete(user.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-center text-slate-900 mb-2">¿Eliminar usuario?</h3>
              <p className="text-sm text-center text-slate-500 mb-6">
                ¿Estás seguro de que deseas eliminar este usuario? Esta acción lo eliminará de la base de datos y no se puede deshacer.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex justify-center items-center"
                >
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
