import { User, LogOut, Clock, LayoutDashboard, Users, Menu, X } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const AdminHeader = ({ userName, onLogout }) => {
  const location = useLocation();
  const isAttendancePage = location.pathname.includes('/attendance');
  const isEmployeesPage = location.pathname.includes('/employees');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationLinks = [
    {
      to: '/admindashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      active: location.pathname === '/admindashboard'
    },
    {
      to: '/admindashboard/attendance',
      icon: Clock,
      label: 'Attendance',
      active: isAttendancePage
    },
    {
      to: '/admindashboard/employees',
      icon: Users,
      label: 'Employees',
      active: isEmployeesPage
    }
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          
          {/* Left section with logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center">
              <LazyLoadImage 
                src="/nextelbpologo.jpg"
                alt="Nextel BPO Logo"
                width={48}
                height={48}
                effect="blur"
                className="object-contain mix-blend-multiply"
              />
            </div>
            <h1 className="text-base sm:text-xl font-semibold text-white">Nextel Employees</h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Navigation Links */}
            <div className="flex items-center space-x-2">
              {navigationLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      link.active 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-slate-600"></div>
            
            {/* User Info & Logout */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-300" />
                <span className="text-sm text-slate-200 font-medium">{userName}</span>
              </div>
              
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center space-x-2">
            {/* User Info (abbreviated on mobile) */}
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-300" />
              <span className="text-sm text-slate-200 font-medium hidden sm:inline">{userName}</span>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-700/50">
            <div className="space-y-2">
              {navigationLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      link.active 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Logout Button */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;