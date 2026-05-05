/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import InactivityMonitor from './components/InactivityMonitor';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Cursos from './pages/Cursos';
import CursoDetalle from './pages/CursoDetalle';
import Calendario from './pages/Calendario';
import Configuracion from './pages/Configuracion';
import EducacionContinua from './pages/EducacionContinua';

// Crear el cliente de React Query con configuraciones por defecto
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de caché hasta que se considere obsoleta
      gcTime: 1000 * 60 * 30, // 30 minutos guardados en memoria antes de ser limpiados (reemplazando cacheTime)
      refetchOnWindowFocus: false, // No recargar automáticamente al volver a la pestaña (opcional)
      retry: 1, // Reintentar 1 vez si falla
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InactivityMonitor />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="cursos" element={<Cursos />} />
              <Route path="cursos/:id" element={<CursoDetalle />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="educacion-continua" element={<EducacionContinua />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
