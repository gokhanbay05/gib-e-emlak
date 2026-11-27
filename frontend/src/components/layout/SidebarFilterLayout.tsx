import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../core';
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
 * Masaüstünde Sol Sabit Filtre Sütunu; mobilde ise ekranın SAĞINDAN kayarak açılan
 * tek tip Sağ Filtre Çekmecesi (Right Slide-Over Drawer).
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

      <AnimatePresence>
        {onCloseMobileFilter && mobileFilterOpen && (
          <>
            <motion.div
              key="filter-drawer-backdrop"
              className="filter-right-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCloseMobileFilter}
            />
            <motion.aside
              key="filter-drawer-panel"
              className="filter-right-drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              aria-label="İlanları Filtrele"
            >
              <div className="filter-right-drawer-header">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={16} color="var(--color-primary)" />
                  <span>İlanları Filtrele</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onCloseMobileFilter}
                  aria-label="Filtreleri Kapat"
                >
                  <X size={18} />
                </Button>
              </div>

              <div className="filter-right-drawer-body">{filterContent}</div>

              {filterFooter && (
                <div className="filter-right-drawer-footer">{filterFooter}</div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default SidebarFilterLayout;
