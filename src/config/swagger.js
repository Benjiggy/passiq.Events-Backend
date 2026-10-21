const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "API documentation for my backend",
    },
    servers: [{ url: "http://localhost:5000", description: "Local" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  // Files that contain your annotations
  apis: ["./routes/*.js", "./models/*.js"],
};

module.exports = swaggerJsdoc(options);
