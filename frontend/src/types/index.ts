// User types
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  institution_id?: string;
  institution_name?: string;
  institution_type?: string;
  is_active: boolean;
  created_at: string;
}

// Institution types
export interface Institution {
  id: string;
  name: string;
  type: 'ministerial' | 'etablissement';
  logo_url?: string;
  header_text?: string;
  footer_text?: string;
  created_at: string;
  updated_at: string;
}

// Employee types
export interface Employee {
  id: string;
  institution_id: string;
  matricule: string;
  full_name: string;
  passport_number?: string;
  position: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// Mission types
export interface Mission {
  id: string;
  mission_number: string;
  employee_id: string;
  institution_id: string;
  destination: string;
  transport_mode: string;
  objective: string;
  issue_date: string;
  departure_date: string;
  return_date: string;
  status: 'draft' | 'pending_dg' | 'pending_msgg' | 'validated' | 'cancelled';
  created_by?: string;
  validated_by_dg?: string;
  validated_by_msgg?: string;
  dg_validated_at?: string;
  msgg_validated_at?: string;
  pdf_url?: string;
  qr_code?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee_name?: string;
  matricule?: string;
  position?: string;
  passport_number?: string;
  institution_name?: string;
  institution_type?: string;
  created_by_name?: string;
  validated_by_dg_name?: string;
  validated_by_msgg_name?: string;
}

// Signature types
export interface Signature {
  id: string;
  institution_id: string;
  signed_by: string;
  title: string;
  role: 'dg' | 'msgg';
  stamp_url?: string;
  signature_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Form types
export interface LoginForm {
  username: string;
  password: string;
}

export interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  role: string;
  institution_id?: string;
}

export interface CreateEmployeeForm {
  matricule: string;
  full_name: string;
  passport_number?: string;
  position: string;
  email?: string;
  phone?: string;
  institution_id?: string;
}

export interface CreateMissionForm {
  employee_id: string;
  destination: string;
  transport_mode: string;
  objective: string;
  departure_date: string;
  return_date: string;
}