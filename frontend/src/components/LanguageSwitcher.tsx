'use client';

import { useTranslation } from '@/app/providers';

export function LanguageSwitcher() {
  const { language, setLanguage, direction, t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as 'fr' | 'ar';
    setLanguage(value);
  };

  return (
    <select
      value={language}
      onChange={handleChange}
      className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-gray-700"
      dir={direction}
      aria-label={t('language.fr') + ' / ' + t('language.ar')}
    >
      <option value="fr">{t('language.fr')}</option>
      <option value="ar">{t('language.ar')}</option>
    </select>
  );
}
