// Tipos espejo de los payloads de routes/api.py

export type Role = "Administrador" | "AdministradorArea" | "Usuario";

export interface AreaRef {
  id: number;
  name: string;
}

export interface Area extends AreaRef {
  description: string | null;
  status: string;
  icon: string;
  color: string;
  platforms_count: number;
}

export interface Platform {
  id: number;
  name: string;
  description: string;
  area_id: number;
  area_name: string | null;
  roles: string | null;
  request_method: string | null;
  direct_link: string | null;
  owner: string | null;
  resources: string | null;
  logo_url: string | null;
  icon: string;
  status: string;
  visits: number;
  created_at: string | null;
  // Presentes solo en /api/catalog
  has_access?: boolean;
  request_pending?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: string;
  areas: AreaRef[];
  created_at: string | null;
  /** Si el solicitante puede modificar a este usuario (alcance por área). */
  editable: boolean | null;
}

export interface AccessRequest {
  id: number;
  platform_id: number;
  platform_name: string | null;
  area_id: number | null;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  status: "Pendiente" | "Aprobado" | "Rechazado";
  request_type: string;
  created_at: string | null;
  processed_at: string | null;
}

export interface Session {
  authenticated: true;
  auth_source: "authelia" | "local" | null;
  user: Pick<User, "id" | "name" | "email" | "role" | "status">;
  permissions: {
    is_superadmin: boolean;
    is_area_admin: boolean;
    is_admin: boolean;
    /** null = sin restricción (superadmin). */
    scoped_area_ids: number[] | null;
    areas: AreaRef[];
  };
}

export interface DashboardData {
  kpis: {
    areas: number;
    platforms: number;
    users: number;
    pending_requests: number;
    approved_requests: number;
  };
  platforms_by_area: { area: string; count: number }[];
  top_platforms: { name: string; visits: number }[];
  recent_requests: AccessRequest[];
}

export interface AuditLog {
  id: number;
  entity_type: string | null;
  entity_name: string | null;
  action: string | null;
  user_name: string | null;
  user_email: string | null;
  description: string | null;
  created_at: string | null;
}
