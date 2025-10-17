import { validationResult } from "express-validator";
import {
  createCategory,
  createProduct,
  deleteProduct,
  getCategories,
  getProductById,
  getProducts,
  updateCategory,
  updateProduct,
} from "../services/productService.js";

export const listCategories = async (req, res) => {
  try {
    const categories = await getCategories();
    res.json({ categories });
  } catch (error) {
    console.error("Error obteniendo categorías", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const listProducts = async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const products = await getProducts({ categoryId, search });
    res.json({ products });
  } catch (error) {
    console.error("Error obteniendo productos", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const showProduct = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json({ product });
  } catch (error) {
    console.error("Error obteniendo producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createProductController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, price, imageUrl, stock, categoryId, active } = req.body;

  try {
    const productId = await createProduct({
      name,
      description,
      price,
      imageUrl,
      stock,
      categoryId,
      active,
    });

    const product = await getProductById(productId);
    res.status(201).json({ product });
  } catch (error) {
    console.error("Error creando producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateProductController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, price, imageUrl, stock, categoryId, active } = req.body;
  const { id } = req.params;

  try {
    const existing = await getProductById(id);
    if (!existing) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await updateProduct(id, { name, description, price, imageUrl, stock, categoryId, active });
    const product = await getProductById(id);
    res.json({ product });
  } catch (error) {
    console.error("Error actualizando producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deleteProductController = async (req, res) => {
  try {
    const existing = await getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    await deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createCategoryController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, active = 1 } = req.body;

  try {
    const categoryId = await createCategory({ name, description, active });
    const categories = await getCategories();
    res.status(201).json({ categoryId, categories });
  } catch (error) {
    console.error("Error creando categoría", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateCategoryController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, active } = req.body;

  try {
    await updateCategory(req.params.id, { name, description, active });
    const categories = await getCategories();
    res.json({ categories });
  } catch (error) {
    console.error("Error actualizando categoría", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
