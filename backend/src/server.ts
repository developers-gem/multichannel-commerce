import app from "./app";
import connectDB from "./database/connectDB";
import { env } from "./config/env";
import { bootstrap } from "./bootstrap/bootstrap";

const startServer = async () => {
  try {
    await connectDB();

    await bootstrap();

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();