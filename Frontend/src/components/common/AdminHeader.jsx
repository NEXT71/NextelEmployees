import { User, LogOut, UserPlus, Clock } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { Link } from 'react-router-dom';

const AdminHeader = ({ userName, onLogout, onRegisterEmployee }) => {
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
          <div className="flex items-center space-x-4">
            <Link
              to="/admindashboard/attendance"
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>Attendance</span>
            </Link>
            
            {onRegisterEmployee && (
              <button
                onClick={onRegisterEmployee}
                className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Employee</span>
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-300" />
              <span className="text-sm text-slate-200 font-medium">{userName}</span>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;