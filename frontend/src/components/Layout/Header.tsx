'use client';

import { useAuth, useTranslation } from '@/app/providers';
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { LanguageSwitcher } from '../LanguageSwitcher';

export default function Header() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Page title */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">
            {t('app.title')}
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-500">
            <BellIcon className="h-6 w-6" />
          </button>

          {/* User info */}
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-mauritania-green flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}