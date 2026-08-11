// import connectDB from "./database/connectDB";
// import { productSyncWorker } from "./modules/sync/sync.worker";

// const startWorker = async () => {
//   try {
//     await connectDB();
//     console.log("⚡ Sync Queue Worker started and listening for jobs...");
//     productSyncWorker.on("completed", (job) => {
//       console.log(`[Worker] Job ${job.id} completed successfully for SyncLog ${job.data.syncLogId}`);
//     });
//     productSyncWorker.on("failed", (job, err) => {
//       console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
//     });
//   } catch (error) {
//     console.error("Failed to start worker:", error);
//     process.exit(1);
//   }
// };
// startWorker();
import dotenv from "dotenv";
dotenv.config(); // Must be at the very top

import connectDB from "./database/connectDB";
import { productSyncWorker } from "./modules/sync/sync.worker";

const startWorker = async () => {
  try {
    await connectDB();

    if (!productSyncWorker) {
      console.warn("⚠️ Redis is not configured. Sync worker is disabled. Set REDIS_URL or REDIS_HOST/REDIS_PORT to enable queue processing.");
      return;
    }

    console.log("⚡ Sync Queue Worker started and listening for jobs...");

    productSyncWorker.on("completed", (job) => {
      console.log(
        `[Worker] Job ${job.id} completed successfully for SyncLog ${job.data.syncLogId}`
      );
    });

    productSyncWorker.on("failed", (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
    });
  } catch (error) {
    console.error("Failed to start worker:", error);
    process.exit(1);
  }
};

startWorker();
