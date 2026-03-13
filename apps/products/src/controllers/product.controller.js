// src/controllers/product.js
import {
  createProduct as createProductService, // Import de la fonction de création depuis le service
  getProducts as getProductsService,     // Import de la fonction pour récupérer tous les produits
  getProductById as getProductByIdService, // Import de la fonction pour récupérer un produit par ID
  updateProduct as updateProductService, // Import de la fonction pour mettre à jour un produit
  deleteProduct as deleteProductService  // Import de la fonction pour supprimer un produit
} from "../services/product.service.js";

// Controller pour créer un produit
export const createProduct = async (req, res) => {
  try {
    const result = await createProductService(req, res); // Appelle le service pour créer un produit
    res.status(result.status).json({ message: result.message, data: result.data }); // Envoie la réponse HTTP avec le résultat
  } catch (error) {
    res.status(500).json({ error: error.message }); // Envoie une réponse d'erreur en cas d'exception
  }
};

// Controller pour récupérer tous les produits
export const getProducts = async (req, res) => {
  try {
    const result = await getProductsService(req, res); // Appelle le service pour récupérer la liste de tous les produits
    res.status(result.status).json({ message: result.message, data: result.data }); // Retourne la réponse avec les produits
  } catch (error) {
    res.status(500).json({ error: error.message }); // Gestion d'une erreur serveur
  }
};

// Controller pour récupérer un produit par son ID
export const getProductById = async (req, res) => {
  try {
    const result = await getProductByIdService(req, res); // Appelle le service pour récupérer le produit spécifique
    res.status(result.status).json({ message: result.message, data: result.data }); // Retourne le produit dans la réponse
  } catch (error) {
    res.status(500).json({ error: error.message }); // Gestion d'une erreur serveur
  }
};

// Controller pour mettre à jour un produit
export const updateProduct = async (req, res) => {
  try {
    const result = await updateProductService(req, res); // Appelle le service pour mettre à jour le produit
    res.status(result.status).json({ message: result.message, data: result.data }); // Retourne le produit mis à jour
  } catch (error) {
    res.status(500).json({ error: error.message }); // Gestion d'une erreur serveur
  }
};

// Controller pour supprimer un produit
export const deleteProduct = async (req, res) => {
  try {
    const result = await deleteProductService(req, res); // Appelle le service pour supprimer le produit
    res.status(result.status).json({ message: result.message, data: result.data }); // Confirme la suppression dans la réponse
  } catch (error) {
    res.status(500).json({ error: error.message }); // Gestion d'une erreur serveur
  }
};