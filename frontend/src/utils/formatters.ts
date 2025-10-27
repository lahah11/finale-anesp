export const formatDate = (date: string | Date, locale = 'fr-FR'): string => {
    return new Date(date).toLocaleDateString(locale);
  };
  
  export const formatDateTime = (date: string | Date, locale = 'fr-FR'): string => {
    return new Date(date).toLocaleString(locale);
  };
  
  export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  export const formatRole = (role: string): string => {
    const roles = {
      super_admin: 'Super Admin',
      admin_local: 'Admin Local',
      hr: 'Ressources Humaines',
      dg: 'Directeur Général',
      msgg: 'MSGG',
      agent: 'Agent',
      police: 'Police'
    };
    return roles[role as keyof typeof roles] || role;
  };
  
  export const formatInstitutionType = (type: string): string => {
    return type === 'ministerial' ? 'Ministériel' : 'Établissement';
  };
  
  export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  export const generateInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };