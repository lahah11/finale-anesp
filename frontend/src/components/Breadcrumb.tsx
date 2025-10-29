'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb() {
  const pathname = usePathname();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Accueil', href: '/dashboard' }
    ];

    const segmentLabels: { [key: string]: string } = {
      dashboard: 'Tableau de bord',
      institutions: 'Institutions',
      users: 'Utilisateurs',
      employees: 'Employés',
      missions: 'Missions',
      signatures: 'Signatures',
      settings: 'Paramètres',
      create: 'Créer',
      edit: 'Modifier'
    };

    pathSegments.forEach((segment, index) => {
      const label = segmentLabels[segment] || segment;
      const href = index === pathSegments.length - 1 
        ? undefined 
        : '/' + pathSegments.slice(0, index + 1).join('/');
      
      breadcrumbs.push({ label, href });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
            )}
            {breadcrumb.href ? (
              <Link
                href={breadcrumb.href}
                className="text-sm font-medium text-gray-500 hover:text-mauritania-green flex items-center"
              >
                {index === 0 && <HomeIcon className="h-4 w-4 mr-1" />}
                {breadcrumb.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-900">
                {breadcrumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}