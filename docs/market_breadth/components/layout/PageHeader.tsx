'use client';

import { ReactNode } from 'react';
import { Breadcrumbs } from './Breadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showBreadcrumbs?: boolean;
}

export function PageHeader({ 
  title, 
  subtitle, 
  actions, 
  showBreadcrumbs = true 
}: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {showBreadcrumbs && (
          <div className="py-4">
            <Breadcrumbs />
          </div>
        )}
        
        {/* Page Header */}
        <div className="py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="mt-4 flex md:mt-0 md:ml-4">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}