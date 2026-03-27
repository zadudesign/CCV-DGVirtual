export type Role = 'admin' | 'decano' | 'coordinador' | 'docente' | 'evaluador' | 'team';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  documento?: string;
  telefono?: string;
  facultad?: string;
  programa?: string;
  team_area?: string;
  firma_digital?: string;
}

export interface Facultad {
  id: string;
  nombre: string;
}

export interface Programa {
  id: string;
  nombre: string;
  facultad_id: string;
}

export interface Curso {
  id: string;
  nombre: string;
  facultad: string;
  programa: string;
  docente_id: string;
  evaluador_id?: string;
  creador_id: string;
  estado: 'Planificación' | 'En Desarrollo' | 'Revisión' | 'Publicado';
  progreso: number;
  tipo_solicitud: 'Creación Completa' | 'Actualización';
  semestre: number;
  fecha_inicio: string;
  tipo_contrato: 'Carga Académica - 5 Horas Semanales' | 'Prestación de Servicios - 1 o 2 Meses';
  created_at: string;
  clickup_url?: string;
  docente?: { name: string; email: string };
  evaluador?: { name: string; email: string };
  creador?: { name: string; email: string };
}
