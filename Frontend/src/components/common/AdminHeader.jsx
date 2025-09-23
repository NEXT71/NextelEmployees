import { User, LogOut, Clock, LayoutDashboard, Users } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { Link, useLocation } from 'react-router-dom';

const AdminHeader = ({ userName, onLogout }) => {
  const location = useLocation();
  const isAttendancePage = location.pathname.includes('/attendance');
  const isEmployeesPage = location.pathname.includes('/employees');

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Left section with logo */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <LazyLoadImage 
                src="/nextelbpologo.jpg"
                alt="Nextel BPO Logo"
                width={48}
                height={48}
                effect="blur"
                className="object-contain mix-blend-multiply"
              />
            </div>
            <h1 className="text-xl font-semibold text-white">Nextel Employees</h1>
          </div>
          
          {/* Right section with buttons */}
          <div className="flex items-center space-x-3">
            {/* Navigation Links */}
            <div className="flex items-center space-x-2">
              <Link
                to="/admindashboard"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  location.pathname === '/admindashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              
              <Link
                to="/admindashboard/attendance"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isAttendancePage 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Attendance</span>
              </Link>
              
              <Link
                to="/admindashboard/employees"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isEmployeesPage 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Employees</span>
              </Link>
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-slate-600"></div>
            
            {/* Action Buttons */}
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
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;