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
  created_at: string;
  docente?: { name: string; email: string };
  evaluador?: { name: string; email: string };
  creador?: { name: string; email: string };
}
