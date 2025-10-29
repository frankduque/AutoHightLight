import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function PageContainer({ 
  children, 
  title, 
  description,
  className = '' 
}: PageContainerProps) {
  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-slate-50 ${className}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </div>
    </div>
  );
}
