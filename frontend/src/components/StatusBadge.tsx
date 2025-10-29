interface StatusBadgeProps {
    status: string;
    type?: 'mission' | 'user' | 'custom';
    customColors?: string;
  }
  
  export default function StatusBadge({ status, type = 'mission', customColors }: StatusBadgeProps) {
    const getStatusColor = () => {
      if (customColors) return customColors;
      
      if (type === 'mission') {
        const colors = {
          draft: 'bg-gray-100 text-gray-800',
          pending_dg: 'bg-yellow-100 text-yellow-800',
          pending_msgg: 'bg-blue-100 text-blue-800',
          validated: 'bg-green-100 text-green-800',
          cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
      }
      
      if (type === 'user') {
        return status === 'active' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800';
      }
      
      return 'bg-gray-100 text-gray-800';
    };
  
    const getStatusText = () => {
      if (type === 'mission') {
        const texts = {
          draft: 'Brouillon',
          pending_dg: 'En attente DG',
          pending_msgg: 'En attente MSGG',
          validated: 'Validée',
          cancelled: 'Annulée'
        };
        return texts[status as keyof typeof texts] || status;
      }
      
      if (type === 'user') {
        return status === 'active' ? 'Actif' : 'Inactif';
      }
      
      return status;
    };
  
    return (
      <span className={`status-badge ${getStatusColor()}`}>
        {getStatusText()}
      </span>
    );
  }