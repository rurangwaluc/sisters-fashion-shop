import { eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/session';
import { db } from '@dispensary/db/client';
import { users } from '@dispensary/db/schema';
import { SettingsForm } from './settings-form';
import { PasswordForm } from './password-form';
import { StaffAccessForm } from './staff-access-form';
import { InstallAppCard } from './install-app-card';

export default async function SettingsPage() {
  const owner = await requireOwner();

  const [settings, staffUsers] = await Promise.all([
    db.query.businessSettings.findFirst(),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
      })
      .from(users)
      .where(eq(users.role, 'EMPLOYEE')),
  ]);

  const safeSettings = {
    businessName: settings?.businessName || 'Sisters Fashion Shop',
    ownerName: owner.name || settings?.ownerName || 'Owner',
    phone: owner.phone || settings?.phone || '',
    address: settings?.address || '',
    currency: settings?.currency || 'RWF',
    lowStockAlertQuantity: settings?.lowStockAlertQuantity || '5',
  };

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
          Owner settings
        </p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5] sm:text-4xl">
          Settings
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
          Manage shop details, owner password, and staff access in one safe place.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            What you control
          </p>

          <div className="mt-4 divide-y divide-neutral-100 text-sm dark:divide-[#343434]">
            <div className="py-3">
              <p className="font-black text-[#222222] dark:text-[#F5F5F5]">Business details</p>
              <p className="mt-1 font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
                These names appear inside the system and reports.
              </p>
            </div>

            <div className="py-3">
              <p className="font-black text-[#222222] dark:text-[#F5F5F5]">Owner password</p>
              <p className="mt-1 font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
                Change the owner password when needed.
              </p>
            </div>

            <div className="py-3">
              <p className="font-black text-[#222222] dark:text-[#F5F5F5]">Staff access</p>
              <p className="mt-1 font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
                Reset staff password or stop staff from signing in.
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
          <div className="mb-5 border-b border-neutral-100 pb-4 dark:border-[#343434]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Shop profile
            </p>
            <h3 className="mt-2 font-display text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
              Business details
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              Simple details only. No technical settings.
            </p>
          </div>

          <SettingsForm settings={safeSettings} />
        </section>
      </section>

      <InstallAppCard />

      <PasswordForm />

      <StaffAccessForm staffUsers={staffUsers} />
    </section>
  );
}
