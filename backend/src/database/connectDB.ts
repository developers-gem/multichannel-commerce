import mongoose from "mongoose";
import { env } from "../config/env";

import dns from "dns";
dns.setServers(["1.1.1.1","8.8.8.8"]); // Set DNS servers to Cloudflare and Google


const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error);

    process.exit(1);
  }
};

export default connectDB;