
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, ShoppingBag, Users, ChefHat, Plus } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/kitchen', icon: ChefHat, label: 'Kitchen' },
    { path: '/payments', icon: Wallet, label: 'Payments' },
    { path: '/customers', icon: Users, label: 'Customers' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            O
          </div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">OrderPrep</span>
        </div>
        
        {/* Quick Add Button (Visible on mobile top bar) */}
        {location.pathname !== '/orders' && (
             <button 
             onClick={() => navigate('/orders')}
             className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full md:hidden"
           >
             <Plus size={20} />
           </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto max-w-2xl p-4 pb-24 md:pb-6">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe md:hidden z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                    isActive ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Navigation (Desktop) */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 pt-20 px-4">
        <div className="space-y-1">
          {navItems.map((item) => {
             const Icon = item.icon;
             return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
             );
          })}
        </div>
      </div>
    </div>
  );
};
