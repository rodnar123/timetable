import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

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
}

export default function Sidebar({ 
  sidebarOpen, 
  activeTab, 
  setActiveTab,
  menuItems 
}: SidebarProps) {
  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: sidebarOpen ? 0 : -260 }}
      className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-40"
    >
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-800">PNGUOT Timetable</h1>
        <p className="text-sm text-gray-600">Management System</p>
      </div>
      <nav className="p-4">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-2 ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </motion.div>
  );
}
