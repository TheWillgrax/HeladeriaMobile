import { validationResult } from "express-validator";
import { getDashboardMetrics } from "../services/adminService.js";
import { createUser, findUserByEmail, findUserById, listUsers } from "../services/userService.js";

const parseIntegerParam = (value, { min, max } = {}) => {
  if (value == null) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return undefined;
  if (min != null && parsed < min) return undefined;
  if (max != null && parsed > max) return undefined;
  return parsed;
};

export const dashboardController = async (req, res) => {
  try {
    const filters = {
      year: parseIntegerParam(req.query.year, { min: 2000, max: 2100 }),
      month: parseIntegerParam(req.query.month, { min: 1, max: 12 }),
      range: req.query.range ? String(req.query.range) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    };

    const data = await getDashboardMetrics(filters);
    res.json(data);
  } catch (error) {
    console.error("Error obteniendo métricas administrativas", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const listUsersController = async (_req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    console.error("Error listando usuarios", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createUserController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone, role = "customer" } = req.body;

  try {
    const normalisedEmail = String(email).trim().toLowerCase();
    const existingUser = await findUserByEmail(normalisedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const userId = await createUser({
      name: String(name).trim(),
      email: normalisedEmail,
      password,
      phone: phone ? String(phone).trim() : null,
      role,
    });

    const createdUser = await findUserById(userId);

    res.status(201).json({ user: createdUser });
  } catch (error) {
    console.error("Error creando usuario", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
