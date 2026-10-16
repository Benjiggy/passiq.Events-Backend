require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const { connectDB } = require("./src/config/db");

const { seedInitialData } = require("./src/seeds/seedData");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to Database (with graceful fallback)
    // require("./src/config/db");
    await connectDB();

    // 3. Start HTTP Server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log("====================================================");
      console.log(`  PASSIQ EVENTS BACKEND IS RUNNING 🚀`);
      console.log(`  Server Port:      http://localhost:${PORT}`);
      console.log(`  API Base URL:     http://localhost:${PORT}/api`);
      console.log(`  Health Check:     http://localhost:${PORT}/api/health`);
      console.log(
        `  Environment:      ${process.env.NODE_ENV || "development"}`,
      );
      console.log("====================================================");
    });

    // Handle Unhandled Rejections
    process.on("unhandledRejection", (err) => {
      logger.error("Unhandled Rejection Error:", err);
    });

    // Handle Uncaught Exceptions
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception Error:", err);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
