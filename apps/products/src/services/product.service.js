import Product from "../models/product.model.js";

// Créer un nouveau produit
export const createProduct = async (data) => {
  const saved = await new Product(data).save();
  return { status: 201, message: "Produit créé avec succès", data: saved };
};

// Récupérer tous les produits
export const getProducts = async () => {
  const products = await Product.find();
  return { status: 200, message: "Liste des produits récupérée", data: products };
};

// Récupérer un produit spécifique par son ID
export const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    return { status: 404, message: "Produit introuvable", data: null };
  }
  return { status: 200, message: "Produit récupéré", data: product };
};

// Mettre à jour un produit existant
export const updateProduct = async (id, data) => {
  const updated = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) {
    return { status: 404, message: "Produit introuvable", data: null };
  }
  return { status: 200, message: "Produit mis à jour", data: updated };
};

// Supprimer un produit
export const deleteProduct = async (id) => {
  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) {
    return { status: 404, message: "Produit introuvable", data: null };
  }
  return { status: 200, message: "Produit supprimé", data: deleted };
};
