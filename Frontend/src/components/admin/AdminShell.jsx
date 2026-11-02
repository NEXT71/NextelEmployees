import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, ReceiptText, Gift, Wallet, TrendingUp, Clock, UserCog, MessageSquare } from 'lucide-react';
import AppShell from '../layout/AppShell';
import AdminMessageCenter from './AdminMessageCenter';
import { useAuth } from '../../contexts/AuthContext';

// Sections of /admindashboard are addressed with ?tab=, so they're linkable
export const ADMIN_TABS = ['employees', 'fines', 'bonuses', 'salaries', 'sales'];

// App shell + navigation for admin and HR pages
const AdminShell = ({ children }) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user, logout } = useAuth();
  const [messagesOpen, setMessagesOpen] = useState(false);

  const onDashboard = pathname === '/admindashboard' || pathname === '/admindashboard/stats';
  const requested = new URLSearchParams(search).get('tab');
  const currentTab = ADMIN_TABS.includes(requested) ? requested : 'employees';

  const tab = (key, label, icon) => ({
    key,
    label,
    icon,
    active: onDashboard && currentTab === key,
    onClick: () => navigate(`/admindashboard?tab=${key}`),
  });
  const page = (key, label, icon, path) => ({
    key,
    label,
    icon,
    active: pathname === path,
    onClick: () => navigate(path),
  });

  const nav = [
    tab('employees', 'Employees', Users),
    page('attendance', 'Attendance', Clock, '/admindashboard/attendance'),
    tab('fines', 'Fines', ReceiptText),
    tab('bonuses', 'Bonuses', Gift),
    tab('salaries', 'Salaries', Wallet),
    tab('sales', 'Sales', TrendingUp),
    page('accounts', 'Employee accounts', UserCog, '/admindashboard/employees'),
    { key: 'messages', label: 'Messages', icon: MessageSquare, active: messagesOpen, onClick: () => setMessagesOpen(true) },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  const role = user?.role === 'hr' ? 'HR' : 'Admin';

  return (
    <AppShell nav={nav} user={{ name: user?.username, detail: role }} onSignOut={handleSignOut}>
      {children}
      <AdminMessageCenter isOpen={messagesOpen} onClose={() => setMessagesOpen(false)} />
    </AppShell>
  );
};

export default AdminShell;
