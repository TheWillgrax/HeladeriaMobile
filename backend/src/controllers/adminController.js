import { getDashboardMetrics } from "../services/adminService.js";
import { listUsers } from "../services/userService.js";

export const dashboardController = async (_req, res) => {
  try {
    const data = await getDashboardMetrics();
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
