const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

// Security Headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS origin not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

// HTTP Request Logger
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Request Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: "error",
    message: "Too many requests from this IP. Please try again later.",
  },
});
app.use("/api", apiLimiter);

// Root Welcome Endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Passiq Events API Backend",
    version: "1.0.0",
    documentation: "/API_DOCUMENTATION.md",
    health: "/api/health",
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Routes under both /api and /api/v1 for 100% frontend compatibility
app.use("/api", routes);
app.use("/api/v1", routes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
