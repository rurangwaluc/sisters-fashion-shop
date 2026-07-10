'use client';

import { useActionState } from 'react';
import {
  resetStaffPasswordAction,
  updateStaffProfileAction,
  updateStaffStatusAction,
} from '@/lib/settings/password-actions';

type StaffUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'DISABLED';
};

type StaffAccessFormProps = {
  staffUsers: StaffUser[];
};

const inputClass =
  'h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#161616] dark:text-[#F5F5F5]';

export function StaffAccessForm({ staffUsers }: StaffAccessFormProps) {
  const [state, action, pending] = useActionState(resetStaffPasswordAction, {});

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#343434] dark:bg-[#222222] sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
        Staff access
      </p>
      <h3 className="mt-2 font-display text-2xl font-black text-[#222222] dark:text-[#F5F5F5]">
        Manage staff
      </h3>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
        Update staff name, phone number, password, or sign-in access.
      </p>

      {staffUsers.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#FAFAFC] p-4 text-sm font-semibold text-[#6B7280] dark:border-[#343434] dark:bg-[#161616] dark:text-[#A3A3A3]">
          No staff account found.
        </div>
      ) : (
        <>
          <form action={action} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <div className="space-y-2">
              <label htmlFor="staffUserId" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Staff member
              </label>
              <select id="staffUserId" name="staffUserId" required className={inputClass}>
                {staffUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} / {staff.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="staffNewPassword" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                New password
              </label>
              <input
                id="staffNewPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="staffConfirmPassword" className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                Confirm password
              </label>
              <input
                id="staffConfirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="h-12 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? 'Resetting...' : 'Reset'}
            </button>
          </form>

          {state.error ? (
            <div className="mt-4 rounded-2xl border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-bold text-[#8A5A00] dark:text-[#FFD45A]">
              {state.error}
            </div>
          ) : null}

          {state.success ? (
            <div className="mt-4 rounded-2xl border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-bold text-[#5F8A63] dark:text-[#79C27D]">
              {state.success}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {staffUsers.map((staff) => (
              <article
                key={staff.id}
                className="rounded-2xl border border-neutral-200 bg-[#FAFAFC] p-4 dark:border-[#343434] dark:bg-[#161616]"
              >
                <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                  <form action={updateStaffProfileAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <input type="hidden" name="staffUserId" value={staff.id} />

                    <div className="space-y-2">
                      <label htmlFor={`staff-name-${staff.id}`} className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                        Name
                      </label>
                      <input
                        id={`staff-name-${staff.id}`}
                        name="name"
                        defaultValue={staff.name}
                        required
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor={`staff-phone-${staff.id}`} className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                        Phone
                      </label>
                      <input
                        id={`staff-phone-${staff.id}`}
                        name="phone"
                        defaultValue={staff.phone || ''}
                        placeholder="+250..."
                        className={inputClass}
                      />
                    </div>

                    <button
                      type="submit"
                      className="h-12 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
                    >
                      Save
                    </button>
                  </form>

                  <div className="space-y-3 xl:min-w-[220px]">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#A3A3A3]">
                        Login email
                      </p>
                      <p className="mt-1 break-words text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                        {staff.email}
                      </p>
                      <p
                        className={
                          staff.status === 'ACTIVE'
                            ? 'mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#5F8A63] dark:text-[#79C27D]'
                            : 'mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#E85D5D]'
                        }
                      >
                        {staff.status === 'ACTIVE' ? 'Can sign in' : 'Access stopped'}
                      </p>
                    </div>

                    <form action={updateStaffStatusAction}>
                      <input type="hidden" name="staffUserId" value={staff.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={staff.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'}
                      />
                      <button
                        type="submit"
                        className={
                          staff.status === 'ACTIVE'
                            ? 'h-10 w-full rounded-2xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 px-4 text-sm font-black text-[#E85D5D] transition hover:bg-[#E85D5D]/15'
                            : 'h-10 w-full rounded-2xl border border-[#5F8A63]/30 bg-[#5F8A63]/10 px-4 text-sm font-black text-[#5F8A63] transition hover:bg-[#5F8A63]/15 dark:text-[#79C27D]'
                        }
                      >
                        {staff.status === 'ACTIVE' ? 'Stop access' : 'Allow access'}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
