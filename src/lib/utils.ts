import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Curso, Role } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getClickupUrlForRole(curso: Curso, role?: Role): string | undefined {
  if (!role) return curso.clickup_url;
  
  switch (role) {
    case 'Diseño':
      return curso.clickup_diseno_url || curso.clickup_url;
    case 'Soporte':
      return curso.clickup_soporte_url || curso.clickup_url;
    case 'Multimedia':
      return curso.clickup_multimedia_url || curso.clickup_url;
    case 'Pedagogía':
      return curso.clickup_pedagogia_url || curso.clickup_url;
    case 'admin':
    case 'coordinador':
    case 'decano':
    case 'team':
      // Admin/coordinators can see the first available one, or we can just return the general one
      return curso.clickup_pedagogia_url || curso.clickup_multimedia_url || curso.clickup_diseno_url || curso.clickup_soporte_url || curso.clickup_url;
    default:
      return curso.clickup_url;
  }
}
