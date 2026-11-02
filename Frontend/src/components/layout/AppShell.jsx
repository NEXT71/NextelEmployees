import { useState } from 'react';
import { Menu, X, LogOut, UserRound } from 'lucide-react';

// Sidebar app shell shared by every role.
// nav: [{ key, label, icon, onClick, active, badge }]
const NavItem = ({ item, onNavigate }) => {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onNavigate?.();
      }}
      aria-current={item.active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium text-left
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift
        ${item.active ? 'bg-shift-soft text-ink' : 'text-muted hover:text-ink hover:bg-paper'}`}
    >
      {Icon && <Icon className={`w-[18px] h-[18px] shrink-0 ${item.active ? 'text-shift' : ''}`} aria-hidden="true" />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-shift text-surface text-xs font-medium inline-flex items-center justify-center tabular-nums">
          {item.badge}
        </span>
      )}
    </button>
  );
};

const SidebarContent = ({ nav, user, onSignOut, onNavigate }) => (
  <div className="flex flex-col h-full">
    <div className="h-16 px-5 flex items-center border-b border-line">
      <img src="/nextel-logo-wide.png" alt="Nextel BPO" className="h-9 w-auto" />
    </div>

    <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main">
      {nav.map((item) => (
        <NavItem key={item.key} item={item} onNavigate={onNavigate} />
      ))}
    </nav>

    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="w-8 h-8 rounded-full bg-paper border border-line flex items-center justify-center shrink-0">
          <UserRound className="w-4 h-4 text-muted" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{user?.name || '—'}</p>
          {user?.detail && <p className="text-xs text-muted truncate">{user.detail}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-1 w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium text-muted hover:text-ink hover:bg-paper
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift"
      >
        <LogOut className="w-[18px] h-[18px]" aria-hidden="true" />
        Sign out
      </button>
    </div>
  </div>
);

const AppShell = ({ nav, user, onSignOut, children }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-surface border-r border-line z-30">
        <SidebarContent nav={nav} user={user} onSignOut={onSignOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-surface border-b border-line flex items-center justify-between px-4">
        <img src="/nextel-logo-wide.png" alt="Nextel BPO" className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2 -mr-2 rounded-lg text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-surface shadow-float">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-3 p-2 rounded-lg text-muted hover:text-ink"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent nav={nav} user={user} onSignOut={onSignOut} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="max-w-[1120px] mx-auto px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
};

export default AppShell;
