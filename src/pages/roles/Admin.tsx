import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatsBar from '../../components/StatsBar';
import DashboardCharts from '../../components/DashboardCharts';

export default function AdminDashboard() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <StatsBar user={user} />
      <DashboardCharts user={user} />
    </div>
  );
}
