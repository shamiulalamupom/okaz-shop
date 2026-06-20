// src/controllers/product.controller.js
import {
  createProduct as createProductService,
  getProducts as getProductsService,
  getProductById as getProductByIdService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
} from "../services/product.service.js";
import { createProductSchema, updateProductSchema } from "../schemas/product.schema.js";

// A single helper guarantees exactly one response per request.
const handle = async (res, work) => {
  try {
    const result = await work();
    res.status(result.status).json({ message: result.message, data: result.data });
  } catch (error) {
    if (error?.name === "CastError") {
      res.status(404).json({ error: "Produit introuvable" });
      return;
    }
    if (error?.name === "ValidationError") {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
};

// Controller pour créer un produit
export const createProduct = async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
    return;
  }
  await handle(res, () => createProductService(parsed.data));
};

// Controller pour récupérer tous les produits
export const getProducts = async (_req, res) => {
  await handle(res, () => getProductsService());
};

// Controller pour récupérer un produit par son ID
export const getProductById = async (req, res) => {
  await handle(res, () => getProductByIdService(req.params.id));
};

// Controller pour mettre à jour un produit
export const updateProduct = async (req, res) => {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
    return;
  }
  await handle(res, () => updateProductService(req.params.id, parsed.data));
};

// Controller pour supprimer un produit
export const deleteProduct = async (req, res) => {
  await handle(res, () => deleteProductService(req.params.id));
};
