import app from "./app";
import connectDB from "./database/connectDB";
import { env } from "./config/env";
import { bootstrap } from "./bootstrap/bootstrap";
import { productSyncWorker, startProductSyncWorker } from "./modules/sync/sync.worker";
import dns from "dns";
dns.setServers(["1.1.1.1","8.8.8.8"]);

const startServer = async () => {
  try {
    await connectDB();

    await bootstrap();

    if (productSyncWorker) {
      startProductSyncWorker();
      console.log("⚡ Product sync worker started with API server");
    } else {
      console.warn("⚠️ Sync worker disabled: configure REDIS_URL/REDIS_ENABLED to process product updates");
    }

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();