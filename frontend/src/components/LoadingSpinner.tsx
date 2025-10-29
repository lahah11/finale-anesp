export default function LoadingSpinner({ size = 'md', text = 'Chargement...' }: { 
    size?: 'sm' | 'md' | 'lg'; 
    text?: string; 
  }) {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-8 w-8', 
      lg: 'h-12 w-12'
    };
  
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <div className={`spinner ${sizeClasses[size]} mb-4`}></div>
        <p className="text-gray-600">{text}</p>
      </div>
    );
  }