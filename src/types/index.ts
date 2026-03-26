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

export interface Course {
  id: string;
  title: string;
  status: 'planning' | 'development' | 'review' | 'published';
  coordinadorId: string;
  docenteId: string;
  evaluadorId?: string;
  progress: number;
  clickupTaskId?: string;
  tallyFormId?: string;
}
