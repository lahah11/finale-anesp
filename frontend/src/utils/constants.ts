export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN_LOCAL: 'admin_local',
    HR: 'hr',
    DG: 'dg',
    MSGG: 'msgg',
    AGENT: 'agent',
    POLICE: 'police'
  } as const;
  
  export const MISSION_STATUSES = {
    DRAFT: 'draft',
    PENDING_DG: 'pending_dg',
    PENDING_MSGG: 'pending_msgg',
    VALIDATED: 'validated',
    CANCELLED: 'cancelled'
  } as const;
  
  export const INSTITUTION_TYPES = {
    MINISTERIAL: 'ministerial',
    ETABLISSEMENT: 'etablissement'
  } as const;
  
  export const TRANSPORT_MODES = [
    'Aérien',
    'Terrestre',
    'Maritime',
    'Ferroviaire'
  ] as const;
  
  export const FILE_UPLOAD_LIMITS = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  } as const;
  
  export const MAURITANIA_COLORS = {
    GREEN: '#006233',
    GREEN_DARK: '#004d28',
    GREEN_LIGHT: '#008f4a',
    YELLOW: '#FFD700',
    YELLOW_DARK: '#e6c200',
    YELLOW_LIGHT: '#fff44d'
  } as const;
  
  export const API_ENDPOINTS = {
    AUTH: '/auth',
    INSTITUTIONS: '/institutions',
    USERS: '/users',
    EMPLOYEES: '/employees',
    MISSIONS: '/missions',
    SIGNATURES: '/signatures'
  } as const;