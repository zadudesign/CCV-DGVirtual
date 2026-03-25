import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setUsuarios((data as User[]) || []);
    } catch (err) {
      console.error('Error fetching usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lista de todos los usuarios inscritos en la plataforma.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-slate-900 flex items-center">
            <UsersIcon className="mr-2 h-5 w-5 text-indigo-600" />
            Usuarios Registrados
          </h3>
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
                  Facultad / Programa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Documento
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios.map((user) => (
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
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.facultad ? (
                        <>
                          <div className="text-slate-900">{user.facultad}</div>
                          {user.programa && <div className="text-xs text-slate-500">{user.programa}</div>}
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.documento || '-'}
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
