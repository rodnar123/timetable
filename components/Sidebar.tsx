import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, X } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  sidebarOpen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  menuItems: MenuItem[];
  setSidebarOpen?: (open: boolean) => void;
}

export default function Sidebar({ 
  sidebarOpen, 
  activeTab, 
  setActiveTab,
  menuItems,
  setSidebarOpen
}: SidebarProps) {
  const handleMenuItemClick = (id: string) => {
    setActiveTab(id);
    // Auto-close sidebar on mobile after selection
    if (window.innerWidth < 1024 && setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ 
          x: sidebarOpen ? 0 : -260
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`
          fixed left-0 top-0 h-full bg-white shadow-xl z-40
          w-64 lg:w-64
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen && setSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Header section */}
        <div className="p-4 lg:p-6 border-b">
          <h1 className="text-lg lg:text-xl font-bold text-gray-800 pr-8 lg:pr-0">
            PNGUOT Timetable
          </h1>
          <p className="text-xs lg:text-sm text-gray-600 hidden sm:block">
            Management System
          </p>
        </div>

        {/* Navigation */}
        <nav className="p-3 lg:p-4 overflow-y-auto h-full pb-20">
          <div className="space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 
                    rounded-lg transition-all duration-200 text-left
                    ${activeTab === item.id
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                  <span className="font-medium text-sm lg:text-base truncate">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer (optional) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            © 2025 PNG Unitech
          </p>
        </div>
      </motion.div>
    </>
  );
}
