// Header.jsx
import { User, LogOut, UserPlus, DollarSign, TrendingUp } from 'lucide-react';
import { LazyLoadImage } from 'react-lazy-load-image-component';

const Header = ({ 
  userName, 
  onLogout, 
  onRegisterEmployee, 
  onProfileClick,
  showProfileButton = true,
  pageTitle = null,
  onNavigateToSalary = null,
  onNavigateToSales = null,
  onNavigateToDashboard = null
}) => {
  return (
    <header className="bg-white border-b border-[#dce5e1] sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 flex items-center justify-center">
              {/* Nextel BPO Logo */}
              <LazyLoadImage 
                src="/nextelbpologo.jpg" // public folder path
                alt="Nextel BPO Logo"
                width={32} 
                height={32}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-[#1d2b27]">Nextel Employees</h1>
              {pageTitle && <p className="text-sm text-[#66736e] mt-0.5">{pageTitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {onRegisterEmployee && (
              <button
                onClick={onRegisterEmployee}
                className="flex items-center space-x-2 px-3 py-1.5 bg-teal-700 text-white hover:bg-teal-800 rounded-md text-sm font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Employee</span>
              </button>
            )}
            
            {onNavigateToDashboard && (
              <button
                onClick={onNavigateToDashboard}
                className="flex items-center space-x-2 px-3 py-1.5 bg-teal-700 text-white hover:bg-teal-800 rounded-md text-sm font-medium transition-colors"
                title="Go to Dashboard"
              >
                <span>Dashboard</span>
              </button>
            )}
            
            {onNavigateToSalary && (
              <button
                onClick={onNavigateToSalary}
                className="flex items-center space-x-2 px-3 py-1.5 bg-teal-700 text-white hover:bg-teal-800 rounded-md text-sm font-medium transition-colors"
                title="View My Salary Slips"
              >
                <DollarSign className="w-4 h-4" />
                <span>My Salary Slip</span>
              </button>
            )}
            
            {onNavigateToSales && (
              <button
                onClick={onNavigateToSales}
                className="flex items-center space-x-2 px-3 py-1.5 bg-teal-700 text-white hover:bg-teal-800 rounded-md text-sm font-medium transition-colors"
                title="View My Sales"
              >
                <TrendingUp className="w-4 h-4" />
                <span>My Sales</span>
              </button>
            )}

            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-[#66736e]" />
              <span className="text-sm text-[#1d2b27] font-medium">{userName}</span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-[#66736e] hover:text-[#1d2b27] transition-colors"
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

export default Header;
