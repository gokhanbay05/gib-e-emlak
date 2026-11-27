import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/layout/PageContainer.css';

export type PageContainerSize = 'narrow' | 'medium' | 'default' | 'wide' | 'full';

export interface PageContainerProps {
  size?: PageContainerSize;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Tek merkezden yönetilen atomik sayfa kapsayıcısı.
 * Sayfa içi geri butonu veya gereksiz alt açıklama metni içermez.
 */
export function PageContainer({
  size = 'default',
  title,
  actions,
  breadcrumb,
  className,
  children,
}: PageContainerProps) {
  return (
    <main className={cn('page-container', `page-container-${size}`, className)}>
      {breadcrumb}
      {(title || actions) && (
        <header className="page-header-bar">
          {title ? <h1 className="page-header-title">{title}</h1> : <div />}
          {actions && <div className="page-header-actions">{actions}</div>}
        </header>
      )}
      {children}
    </main>
  );
}

export default PageContainer;
