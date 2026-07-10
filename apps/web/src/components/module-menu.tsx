'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';

type UserRole = 'OWNER' | 'EMPLOYEE';

const moduleGroups = [
  {
    title: 'Home',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['OWNER', 'EMPLOYEE'],
      },
      {
        label: 'Money',
        href: '/money',
        icon: WalletCards,
        roles: ['OWNER'],
      },
    ],
  },
  {
    title: 'Daily work',
    items: [
      {
        label: 'Sales',
        href: '/sales',
        icon: ShoppingBag,
        roles: ['OWNER', 'EMPLOYEE'],
      },
      {
        label: 'Products',
        href: '/products',
        icon: Package,
        roles: ['OWNER', 'EMPLOYEE'],
      },
      {
        label: 'Stock',
        href: '/stock',
        icon: Boxes,
        roles: ['OWNER', 'EMPLOYEE'],
      },
      {
        label: 'Customers',
        href: '/customers',
        icon: Users,
        roles: ['OWNER', 'EMPLOYEE'],
      },
    ],
  },
  {
    title: 'Owner tools',
    items: [
      {
        label: 'Unpaid sales',
        href: '/debts',
        icon: CreditCard,
        roles: ['OWNER', 'EMPLOYEE'],
      },
      {
        label: 'Expenses',
        href: '/expenses',
        icon: WalletCards,
        roles: ['OWNER'],
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        roles: ['OWNER'],
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['OWNER'],
      },
    ],
  },
] as const;

function getVisibleGroups(userRole: UserRole) {
  return moduleGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (item.roles as readonly UserRole[]).includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);
}

type ModuleMenuProps = {
  userRole: UserRole;
};

export function ModuleMenu({ userRole }: ModuleMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const visibleGroups = useMemo(() => getVisibleGroups(userRole), [userRole]);
  const allRoutes = useMemo(
    () => visibleGroups.flatMap((group) => group.items.map((item) => item.href)),
    [visibleGroups],
  );

  useEffect(() => {
    allRoutes.forEach((route) => {
      router.prefetch(route);
    });
  }, [allRoutes, router]);

  function goToPage(href: string) {
    setIsOpen(false);

    if (href === pathname) {
      return;
    }

    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--surface)]"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <ClipboardList className="h-4 w-4" />
        <span className="hidden sm:inline">{isPending ? 'Opening...' : 'Menu'}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-y-auto border border-[var(--border)] bg-[var(--card)] p-3 shadow-2xl shadow-black/10 sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[360px]">
            <div className="mb-3 border-b border-[var(--border)] pb-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                Menu
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                Choose where you want to go.
              </p>
            </div>

            <div className="space-y-4">
              {visibleGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                    {group.title}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => goToPage(item.href)}
                          onMouseEnter={() => router.prefetch(item.href)}
                          className={
                            isActive
                              ? 'flex items-center gap-2 rounded-lg border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-3 text-left text-sm font-black text-[var(--primary-strong)]'
                              : 'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-left text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--surface)]'
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="sr-only">
              {allRoutes.map((route) => (
                <Link key={route} href={route} prefetch>
                  {route}
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
