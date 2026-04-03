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

export interface EntregaCalendario {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion?: string;
  fecha_entrega: string;
  estado: 'Pendiente' | 'En Progreso' | 'Completado' | 'Atrasado';
  created_at: string;
  curso?: {
    nombre: string;
  };
}

export interface NotificacionTarea {
  id: string;
  created_at: string;
  usuario_id: string;
  curso_id?: string;
  titulo: string;
  descripcion?: string;
  estado: string;
  fecha_vencimiento?: string;
  clickup_task_id?: string;
  url_clickup?: string;
  curso?: {
    nombre: string;
  };
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
  progreso_general?: number;
  progreso_documentacion?: number;
  progreso_grabacion?: number;
  progreso_edicion?: number;
  progreso_soporte?: number;
  tipo_solicitud: 'Creación Completa' | 'Actualización' | 'Visita MEN';
  semestre: number;
  fecha_inicio: string;
  tipo_contrato: 'Carga Académica - 5 Horas Semanales' | 'Prestación de Servicios - 1 o 2 Meses';
  created_at: string;
  clickup_url?: string;
  clickup_list_id?: string;
  drive_url?: string;
  make_webhook_url?: string;
  clickup_stats?: any;
  docente?: { name: string; email: string };
  evaluador?: { name: string; email: string };
  creador?: { name: string; email: string };
}
