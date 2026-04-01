/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Cursos from './pages/Cursos';
import CursoDetalle from './pages/CursoDetalle';
import Calendario from './pages/Calendario';
import Configuracion from './pages/Configuracion';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="cursos" element={<Cursos />} />
            <Route path="cursos/:id" element={<CursoDetalle />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
