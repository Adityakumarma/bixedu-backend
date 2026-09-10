import "dotenv/config";
import { connectDatabase } from "./config/database";
import { User } from "./models/User";
import { UserRole } from "./constants/roles";

async function seedSuperAdmin() {
  await connectDatabase();

  const superAdminEmail = "superadmin@bixedu.com";
  const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

  if (existingSuperAdmin) {
    console.log(`\nSuper Admin already exists!`);
    console.log(`Email: ${superAdminEmail}`);
    console.log(`Password: (Password set during creation)\n`);
    process.exit(0);
  }

  const superAdmin = await User.create({
    name: "Super Administrator",
    email: superAdminEmail,
    password: "SuperAdminPassword123!",
    role: UserRole.SUPER_ADMIN,
    isActive: true
  });

  console.log(`\n=========================================`);
  console.log(`  SUPER ADMIN ACCOUNT CREATED SUCCESSFULLY `);
  console.log(`=========================================`);
  console.log(`Email:    ${superAdmin.email}`);
  console.log(`Password: SuperAdminPassword123!`);
  console.log(`Role:     ${superAdmin.role}`);
  console.log(`=========================================\n`);

  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  console.error("Error seeding Super Admin:", err);
  process.exit(1);
});
