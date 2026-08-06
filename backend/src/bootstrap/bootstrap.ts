import { createAdmin } from "./createAdmin";

export const bootstrap = async () => {
  console.log("🚀 Running bootstrap...");

  await createAdmin();

  console.log("✅ Bootstrap completed");
};