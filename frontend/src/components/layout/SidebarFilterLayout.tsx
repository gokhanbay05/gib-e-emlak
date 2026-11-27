import React from 'react';
import { cn } from '../../lib/utils';
import Modal from '../core/Modal';
import '../../css/layout/SidebarFilterLayout.css';

export interface SidebarFilterLayoutProps {
  filterContent: React.ReactNode;
  filterFooter?: React.ReactNode;
  isMapMode?: boolean;
  mobileFilterOpen?: boolean;
  onCloseMobileFilter?: () => void;
  children: React.ReactNode;
}

/**
 * Hepsiemlak Screenshot #2 & #4 tarzı Sol Sabit Filtre Sütunu + Sağ Liste/Harita Yerleşimi.
 * Masaüstünde sol sütun her zaman görünürdür; mobilde ise Modal olarak açılır.
 */
export function SidebarFilterLayout({
  filterContent,
  filterFooter,
  isMapMode = false,
  mobileFilterOpen = false,
  onCloseMobileFilter,
  children,
}: SidebarFilterLayoutProps) {
  return (
    <>
      <div
        className={cn(
          'sidebar-filter-layout',
          isMapMode && 'is-map-mode',
        )}
      >
        <aside className="sidebar-filter-column">
          <div className="sidebar-filter-scroll">{filterContent}</div>
          {filterFooter && (
            <div className="sidebar-filter-footer">{filterFooter}</div>
          )}
        </aside>

        <section className="sidebar-main-column">{children}</section>
      </div>

      {onCloseMobileFilter && (
        <Modal
          isOpen={mobileFilterOpen}
          onClose={onCloseMobileFilter}
          title="İlanları Filtrele"
          size="sm"
          footer={filterFooter}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filterContent}
          </div>
        </Modal>
      )}
    </>
  );
}

export default SidebarFilterLayout;
