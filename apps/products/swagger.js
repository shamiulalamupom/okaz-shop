const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Products Service API",
      version: "1.0.0",
      description: "API CRUD pour gérer les produits du catalogue"
    },
    servers: [
      { url: "http://localhost:3002" }
    ],
    components: {
      schemas: {
        Product: {
          type: "object",
          required: ["name", "price"],
          properties: {
            _id: { type: "string", description: "ID MongoDB du produit" },
            name: { type: "string", description: "Nom du produit" },
            description: { type: "string", description: "Description du produit" },
            price: { type: "number", description: "Prix du produit" },
            category: { type: "string", description: "Catégorie du produit" },
            createdAt: { type: "string", format: "date-time", description: "Date de création" }
          },
          example: {
            _id: "64f4b5a9d3a3b0c1f1234567",
            name: "Produit Test",
            description: "Description produit",
            price: 99.99,
            category: "Catégorie A",
            createdAt: "2026-03-05T12:00:00Z"
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

// Définition des routes Swagger pour Express
const swaggerUi = require("swagger-ui-express");
const express = require("express");
const router = express.Router();

router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = router;