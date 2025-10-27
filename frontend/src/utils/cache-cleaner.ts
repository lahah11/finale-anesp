// Utilitaire pour nettoyer le cache du navigateur
export const clearBrowserCache = () => {
  try {
    // Nettoyer localStorage
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Nettoyer sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Nettoyer les cookies liés à l'application
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    console.log('✅ Cookies cleared');
    
    // Forcer le rechargement de la page
    window.location.reload();
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
};

// Fonction pour vérifier si le token est valide
export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    // Décoder le JWT pour vérifier l'expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    return payload.exp > currentTime;
  } catch (error) {
    console.error('❌ Invalid token format:', error);
    return false;
  }
};

// Fonction pour forcer la reconnexion
export const forceReconnect = () => {
  console.log('🔄 Forcing reconnection...');
  
  // Nettoyer le cache
  clearBrowserCache();
  
  // Rediriger vers la page de connexion
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
};


