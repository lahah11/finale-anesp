'use client';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { EnvelopeIcon, PhoneIcon, LifebuoyIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/app/providers';

export default function SupportPage() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('support.title')}</h1>
            <p className="mt-2 text-gray-600">{t('support.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <LifebuoyIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('support.contact.title')}</h2>
                <p className="text-sm text-gray-600">{t('support.contact.description')}</p>
              </div>
            </div>
            <dl className="space-y-4 text-sm text-gray-700">
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <dt className="font-medium">{t('support.contact.email')}</dt>
                  <dd>support@anesp.gov.mr</dd>
                </div>
              </div>
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <dt className="font-medium">{t('support.contact.phone')}</dt>
                  <dd>+222 45 00 00 00</dd>
                </div>
              </div>
              <div className="flex items-center">
                <BookOpenIcon className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <dt className="font-medium">{t('support.contact.portal')}</dt>
                  <dd>
                    <a
                      href="https://support.anesp.gov.mr"
                      className="text-blue-600 hover:text-blue-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('support.portal.linkLabel')}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span>{t('support.contact.hours')}</span>
              </div>
            </dl>
          </section>

          <section className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <BookOpenIcon className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('support.procedures.title')}</h2>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-gray-700 list-disc list-inside">
              <li>{t('support.procedures.create')}</li>
              <li>{t('support.procedures.validate')}</li>
              <li>{t('support.procedures.documents')}</li>
              <li>{t('support.procedures.archiving')}</li>
            </ul>
          </section>
        </div>

        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('support.faq.title')}</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900">{t('support.faq.creation')}</h3>
              <p className="mt-1">{t('support.faq.answer.creation')}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{t('support.faq.validation')}</h3>
              <p className="mt-1">{t('support.faq.answer.validation')}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{t('support.faq.documents')}</h3>
              <p className="mt-1">{t('support.faq.answer.documents')}</p>
            </div>
          </div>
        </section>

        <section className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <LifebuoyIcon className="h-6 w-6 text-indigo-600 mr-3" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('support.guides.title')}</h2>
              <p className="text-sm text-gray-600">{t('support.guides.description')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{t('support.guides.validation')}</h3>
              <p className="mt-1 text-xs text-gray-600">PDF · 2 Mo</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{t('support.guides.logistics')}</h3>
              <p className="mt-1 text-xs text-gray-600">PDF · 1,5 Mo</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{t('support.guides.documents')}</h3>
              <p className="mt-1 text-xs text-gray-600">PDF · 1 Mo</p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
