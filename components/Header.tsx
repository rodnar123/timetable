import React from 'react';
import { Menu, Bell, User, ChevronDown } from 'lucide-react';
import { Conflict } from '@/types/database';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  conflicts: Conflict[];
}

const Header: React.FC<HeaderProps> = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  showNotifications, 
  setShowNotifications,
  conflicts 
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
        {/* Left side - Menu button and title */}
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 lg:w-6 lg:h-6 text-gray-700" />
          </button>
          
          {/* Page title - hidden on mobile */}
          <div className="hidden sm:block">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
              Timetable System
            </h2>
          </div>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-gray-700" />
              {conflicts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {conflicts.length > 9 ? '9+' : conflicts.length}
                </span>
              )}
            </button>

            {/* Notifications dropdown - responsive positioning */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notifications
                    {conflicts.length > 0 && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        {conflicts.length}
                      </span>
                    )}
                  </h3>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {conflicts.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500">No conflicts detected</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {conflicts.slice(0, 5).map((conflict, index) => (
                        <div key={index} className="p-3 hover:bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {conflict.type} Conflict
                              </p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {conflict.description}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Severity: {conflict.severity}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {conflicts.length > 5 && (
                        <div className="p-3 text-center border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            +{conflicts.length - 5} more conflicts
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* User avatar */}
            <div className="w-8 h-8 lg:w-9 lg:h-9 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            
            {/* User info - hidden on small screens */}
            <div className="hidden md:flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            {/* Mobile user name */}
            <div className="md:hidden">
              <span className="text-sm font-medium text-gray-700">Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile page title */}
      <div className="sm:hidden px-4 pb-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Timetable System
        </h2>
      </div>
    </header>
  );
};

export default Header;
