import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { businessSettings, users } from './schema.ts';
import { db, queryClient } from './client.ts';

const ownerEmail = process.env.OWNER_EMAIL || 'owner@sistersfashion.local';
const ownerPassword = process.env.OWNER_PASSWORD || 'Owner@12345';
const ownerName = process.env.OWNER_NAME || 'Sisters Fashion Owner';
const businessName = process.env.BUSINESS_NAME || 'Sisters Fashion Shop';

const employeeEmail = process.env.EMPLOYEE_EMAIL;
const employeePassword = process.env.EMPLOYEE_PASSWORD || 'Employee@12345';
const employeeName = process.env.EMPLOYEE_NAME || 'Sisters Fashion Employee';

async function upsertUser(input: {
  email: string;
  password: string;
  name: string;
  role: 'OWNER' | 'EMPLOYEE';
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const email = input.email.toLowerCase();

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    await db
      .update(users)
      .set({
        name: input.name,
        passwordHash,
        role: input.role,
        status: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    console.log(`${input.role} updated successfully.`);
  } else {
    await db.insert(users).values({
      name: input.name,
      email,
      passwordHash,
      role: input.role,
      status: 'ACTIVE',
    });

    console.log(`${input.role} created successfully.`);
  }

  console.log('Email:', email);
  console.log('Password:', input.password);
}

async function main() {
  await upsertUser({
    email: ownerEmail,
    password: ownerPassword,
    name: ownerName,
    role: 'OWNER',
  });

  if (employeeEmail) {
    await upsertUser({
      email: employeeEmail,
      password: employeePassword,
      name: employeeName,
      role: 'EMPLOYEE',
    });
  }

  const existingSettings = await db.query.businessSettings.findFirst();

  if (!existingSettings) {
    await db.insert(businessSettings).values({
      businessName,
      ownerName,
      currency: 'RWF',
    });
  } else {
    await db
      .update(businessSettings)
      .set({
        businessName,
        ownerName,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.id, existingSettings.id));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
