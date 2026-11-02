import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, FileText, MessageSquare } from 'lucide-react';
import AppShell from '../layout/AppShell';
import MessageCenter from '../common/MessageCenter';
import { useAuth } from '../../contexts/AuthContext';

// App shell + navigation for CSR pages (dashboard, sales, salary slips)
const EmployeeShell = ({ userName, userDetail, children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [messagesOpen, setMessagesOpen] = useState(false);

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/employeedashboard' },
    { key: 'sales', label: 'My sales', icon: TrendingUp, path: '/employee/sales-dashboard' },
    { key: 'slips', label: 'Salary slips', icon: FileText, path: '/employee/salary-slips' },
  ].map((item) => ({ ...item, active: pathname === item.path, onClick: () => navigate(item.path) }));

  nav.push({ key: 'messages', label: 'Messages', icon: MessageSquare, active: messagesOpen, onClick: () => setMessagesOpen(true) });

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  // /auth/me populates employeeId with the employee's name and ID
  const profile = typeof user?.employeeId === 'object' ? user.employeeId : null;
  const profileName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';

  return (
    <AppShell
      nav={nav}
      user={{ name: userName || profileName || user?.username, detail: userDetail || profile?.employeeId }}
      onSignOut={handleSignOut}
    >
      {children}
      <MessageCenter isOpen={messagesOpen} onClose={() => setMessagesOpen(false)} />
    </AppShell>
  );
};

export default EmployeeShell;
