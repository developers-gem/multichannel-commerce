import User from "../modules/auth/user.model";
import { UserRole } from "../shared/enums/roles.enum";

export const createAdmin = async () => {
  const admin = await User.findOne({
    email: "admin@multichannel.com",
  });

  if (admin) {
    console.log("ℹ️ Default Admin already exists");
    return;
  }

  await User.create({
    firstName: "Super",
    lastName: "Admin",
    email: "admin@multichannel.com",
    password: "Admin@123",
    role: UserRole.ADMIN,
  });

  console.log("✅ Default Admin created");
};