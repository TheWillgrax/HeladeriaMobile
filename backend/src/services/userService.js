import bcrypt from "bcryptjs";
import { pool, query } from "../config/db.js";

const BCRYPT_ROUNDS = 10;

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);

const updatePasswordHash = async (userId, password) => {
  const passwordHash = await hashPassword(password);
  await pool.execute("UPDATE users SET password_hash = :passwordHash WHERE id = :id", {
    passwordHash,
    id: userId,
  });
};

export const findUserByEmail = async (email) => {
  const users = await query("SELECT * FROM users WHERE email = :email", { email });
  return users[0];
};

export const findUserById = async (id) => {
  const users = await query("SELECT id, name, email, phone, role, created_at FROM users WHERE id = :id", { id });
  return users[0];
};

export const createUser = async ({ name, email, password, phone, role = "customer" }) => {
  const passwordHash = await hashPassword(password);
  const normalizedPhone = phone ?? null;
  const [result] = await pool.execute(
    "INSERT INTO users (name, email, password_hash, phone, role) VALUES (:name, :email, :passwordHash, :phone, :role)",
    { name, email, passwordHash, phone: normalizedPhone, role }
  );
  return result.insertId;
};

export const listUsers = async () => {
  return query(
    `SELECT id, name, email, phone, role, created_at AS createdAt
     FROM users
     ORDER BY created_at DESC`
  );
};

export const verifyUserPassword = async (user, password) => {
  if (!user?.password_hash) {
    return false;
  }

  if (isBcryptHash(user.password_hash)) {
    try {
      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      return false;
    }
  }

  if (user.password_hash === password) {
    await updatePasswordHash(user.id, password);
    return true;
  }

  return false;
};

export const ensureAdminUser = async ({ name, email, password, phone }) => {
  if (!email || !password) {
    return;
  }

  const existingAdmin = await findUserByEmail(email);
  if (!existingAdmin) {
    await createUser({
      name: name || "Administrador",
      email,
      password,
      phone,
      role: "admin",
    });
    return;
  }

  if (existingAdmin.role !== "admin") {
    await pool.execute("UPDATE users SET role = 'admin' WHERE id = :id", { id: existingAdmin.id });
  }

  const hasValidPassword = await verifyUserPassword(existingAdmin, password);

  if (!hasValidPassword) {
    await updatePasswordHash(existingAdmin.id, password);
  }
};
