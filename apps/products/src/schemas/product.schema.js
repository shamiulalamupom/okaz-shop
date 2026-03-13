import zod from "zod";

// Créer produit
export const createProductSchema = zod.object({
  name: zod.string().min(1, "Le nom du produit est requis"),
  description: zod.string().optional(),
  price: zod.number().positive("Le prix doit être un nombre positif"),
  category: zod.string().optional(),
});

// Modifier produit
export const updateProductSchema = zod.object({
  name: zod.string().min(1, "Le nom du produit est requis").optional(),
  description: zod.string().optional(),
  price: zod.number().positive("Le prix doit être un nombre positif").optional(),
  category: zod.string().optional(),
});

// Valider l'ID
export const productIdSchema = zod.object({
  id: zod.string().min(1, "L'id du produit est requis"),
});