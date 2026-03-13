
exports.validateProductData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === "") {
    errors.push("Le nom du produit est obligatoire");
  }

  if (data.price === undefined || data.price === null) {
    errors.push("Le prix est obligatoire");
  }

  if (data.price && data.price < 0) {
    errors.push("Le prix doit être positif");
  }

  return errors;
};