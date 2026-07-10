import { AppHeader } from '@/components/app-header';
import { requireUser } from '@/lib/auth/session';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 py-3 text-[var(--text)] sm:px-5 sm:py-5 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
        <AppHeader userName={user.name} userRole={user.role} />
        {children}
      </div>
    </main>
  );
}
