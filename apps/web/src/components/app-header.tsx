'use client';

import { LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/auth/actions';
import { ModuleMenu } from './module-menu';
import { ThemeToggle } from './theme-toggle';

function getPageName(pathname: string) {
  if (pathname === '/dashboard') {
    return { eyebrow: 'Dashboard', title: 'Welcome' };
  }

  if (pathname === '/settings') {
    return { eyebrow: 'Settings', title: 'Business settings' };
  }

  if (pathname === '/products/new') {
    return { eyebrow: 'Products', title: 'Add product' };
  }

  if (pathname.startsWith('/products/') && pathname.endsWith('/edit')) {
    return { eyebrow: 'Products', title: 'Edit product' };
  }

  if (pathname === '/products') {
    return { eyebrow: 'Products', title: 'Products' };
  }

  if (pathname === '/sales/new') {
    return { eyebrow: 'Sales', title: 'New sale' };
  }

  if (pathname === '/sales') {
    return { eyebrow: 'Sales', title: 'Sales' };
  }

  if (pathname === '/stock/receive') {
    return { eyebrow: 'Stock', title: 'Add stock' };
  }

  if (pathname === '/stock') {
    return { eyebrow: 'Stock', title: 'Stock' };
  }

  if (pathname?.startsWith('/debts/') && pathname !== '/debts') {
    return { eyebrow: 'Unpaid sales', title: 'Unpaid sale details' };
  }

  if (pathname === '/debts') {
    return { eyebrow: 'Unpaid sales', title: 'Unpaid sales' };
  }

  if (pathname?.startsWith('/customers/') && pathname !== '/customers') {
    return { eyebrow: 'Customers', title: 'Customer details' };
  }

  if (pathname === '/customers') {
    return { eyebrow: 'Customers', title: 'Customers' };
  }

  if (pathname === '/money') {
    return { eyebrow: 'Money', title: 'Money' };
  }

  if (pathname === '/expenses') {
    return { eyebrow: 'Expenses', title: 'Expenses' };
  }

  if (pathname === '/reports') {
    return { eyebrow: 'Reports', title: 'Reports' };
  }

  return { eyebrow: 'Menu', title: 'Sisters Fashion Shop' };
}

type AppHeaderProps = {
  userName: string;
  userRole: 'OWNER' | 'EMPLOYEE';
};

export function AppHeader({ userName, userRole }: AppHeaderProps) {
  const pathname = usePathname();
  const page = getPageName(pathname);
  const title = pathname === '/dashboard' ? `${page.title}, ${userName}` : page.title;
  const roleName = userRole === 'OWNER' ? 'Owner' : 'Employee';

  return (
    <header className="border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-black text-white shadow-lg shadow-pink-500/20">
            LE
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              {page.eyebrow}
            </p>
            <h1 className="truncate text-xl font-black tracking-tight text-[var(--text)] sm:text-2xl">
              {title}
            </h1>
            <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">{roleName} access</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ModuleMenu userRole={userRole} />
          <ThemeToggle />
          <form action={logoutAction}>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--surface)]">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
