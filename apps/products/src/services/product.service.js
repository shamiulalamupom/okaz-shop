import Product from "../models/product.js";

// Créer un nouveau produit
export const createProduct = async (req, res) => {
  try {
    // Création d'une nouvelle instance du modèle Product
    const product = new Product(req.body);

    // Sauvegarde du produit dans la base de données
    const saved = await product.save();

    // Retour d'une réponse indiquant que la création a réussi
    return {
      status: 201,
      message: "Produit créé avec succès",
      data: saved,
    };
  } catch (error) {
    // Gestion des erreurs en cas de problème serveur
    res.status(500).json({ error: error.message });
  }
};

// Récupérer tous les produits
export const getProducts = async (req, res) => {
  try {
    // Recherche de tous les produits dans la base de données
    const products = await Product.find();

    // Retour de la liste des produits
    return {
      status: 200,
      message: "Liste des produits récupérée",
      data: products,
    };
  } catch (error) {
    // Gestion des erreurs serveur
    res.status(500).json({ error: error.message });
  }
};

// Récupérer un produit spécifique par son ID
export const getProductById = async (req, res) => {
  try {
    // Recherche du produit correspondant à l'ID dans les paramètres de la requête
    const product = await Product.findById(req.params.id);

    // Retour du produit trouvé
    return {
      status: 200,
      message: "Produit récupéré",
      data: product,
    };
  } catch (error) {
    // Gestion des erreurs serveur
    res.status(500).json({ error: error.message });
  }
};

// Mettre à jour un produit existant
export const updateProduct = async (req, res) => {
  try {
    // Mise à jour du produit en utilisant son ID et les nouvelles données envoyées
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // retourne la version mise à jour
        runValidators: true, // applique les validations du modèle
      }
    );

    // Retour du produit après modification
    return {
      status: 200,
      message: "Produit mis à jour",
      data: updated,
    };
  } catch (error) {
    // Gestion des erreurs serveur
    res.status(500).json({ error: error.message });
  }
};

// Supprimer un produit
export const deleteProduct = async (req, res) => {
  try {
    // Suppression du produit correspondant à l'ID
    const deleted = await Product.findByIdAndDelete(req.params.id);

    // Confirmation de la suppression
    return {
      status: 200,
      message: "Produit supprimé",
      data: deleted,
    };
  } catch (error) {
    // Gestion des erreurs serveur
    res.status(500).json({ error: error.message });
  }
};