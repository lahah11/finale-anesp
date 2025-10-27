'use client';

import { useAuth } from '@/app/providers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  CogIcon,
  PowerIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const navigation = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['super_admin', 'admin_local', 'hr', 'dg', 'msgg']
  },
  {
    name: 'Institutions',
    href: '/institutions',
    icon: BuildingOfficeIcon,
    roles: ['super_admin']
  },
  {
    name: 'Utilisateurs',
    href: '/users',
    icon: UsersIcon,
    roles: ['super_admin', 'admin_local']
  },
  {
    name: 'Employés',
    href: '/employees',
    icon: UserGroupIcon,
    roles: ['super_admin', 'admin_local', 'hr']
  },
  {
    name: 'Ordres de Mission',
    href: '/missions',
    icon: DocumentTextIcon,
    roles: ['super_admin', 'admin_local', 'dg', 'msgg']
  },
  {
    name: 'Moyens Logistiques',
    href: '/logistics',
    icon: TruckIcon,
    roles: ['msgg']
  },
  {
    name: 'Signatures',
    href: '/signatures',
    icon: PencilSquareIcon,
    roles: ['super_admin', 'admin_local']
  },
  {
    name: 'Paramètres',
    href: '/settings',
    icon: CogIcon,
    roles: ['super_admin', 'admin_local']
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow pt-5 bg-mauritania-green overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="h-15 w-15 bg-mauritania-green rounded-full flex items-center justify-center p-1">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={50}
                  height={50}
                  className="object-contain"
                />
              </div>
              <div className="ml-3">
                <h1 className="text-white font-bold text-lg">SOM</h1>
                <p className="text-mauritania-yellow text-xs">Système d'Ordre de Mission</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-6 px-4">
            <div className="bg-mauritania-green-dark rounded-lg p-3">
              <p className="text-white font-medium text-sm">{user.username}</p>
              <p className="text-mauritania-yellow text-xs capitalize">{user.role.replace('_', ' ')}</p>
              {user.institution_name && (
                <p className="text-gray-300 text-xs mt-1 truncate">{user.institution_name}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    isActive
                      ? 'bg-mauritania-green-dark text-white'
                      : 'text-gray-300 hover:bg-mauritania-green-dark hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                      'mr-3 flex-shrink-0 h-5 w-5'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="flex-shrink-0 p-4">
            <button
              onClick={logout}
              className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-red-600 hover:text-white transition-colors duration-150"
            >
              <PowerIcon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-white" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}