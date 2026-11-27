import React from 'react';
import { cn } from '../../lib/utils';
import '../../css/layout/DetailSplitLayout.css';

export interface DetailSplitLayoutProps {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarPosition?: 'right' | 'left';
  className?: string;
}

/**
 * Hepsiemlak Screenshot #6 (İlan Detay) ve Screenshot #12 (Emlak Ofisi & Danışmanlar)
 * sayfaları için kullanılan 2 sütunlu (Ana İçerik + Sticky Yan Sütun) şablon.
 */
export function DetailSplitLayout({
  main,
  sidebar,
  sidebarPosition = 'right',
  className,
}: DetailSplitLayoutProps) {
  return (
    <div
      className={cn(
        'detail-split-layout',
        sidebarPosition === 'left' && 'is-left-sidebar',
        className,
      )}
    >
      {sidebarPosition === 'left' ? (
        <>
          <aside className="detail-sticky-sidebar">{sidebar}</aside>
          <div className="detail-main-column">{main}</div>
        </>
      ) : (
        <>
          <div className="detail-main-column">{main}</div>
          <aside className="detail-sticky-sidebar">{sidebar}</aside>
        </>
      )}
    </div>
  );
}

export default DetailSplitLayout;
