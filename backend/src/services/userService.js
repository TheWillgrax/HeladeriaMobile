import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "crypto";
import { pool, query } from "../config/db.js";

const BCRYPT_ROUNDS = 10;

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);

const LEGACY_HASH_TYPES = [
  { algorithm: "md5", hexLength: 32 },
  { algorithm: "sha1", hexLength: 40 },
  { algorithm: "sha256", hexLength: 64, base64Length: 44 },
  { algorithm: "sha512", hexLength: 128, base64Length: 88 },
];

const isHexStringOfLength = (value, length) =>
  typeof value === "string" && value.length === length && /^[0-9a-f]+$/i.test(value);

const isBase64StringOfLength = (value, length) =>
  typeof value === "string" &&
  value.length === length &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const matchesLegacyHash = (storedHash, password) => {
  if (typeof storedHash !== "string" || !storedHash.trim()) {
    return false;
  }

  for (const { algorithm, hexLength, base64Length } of LEGACY_HASH_TYPES) {
    if (hexLength && isHexStringOfLength(storedHash, hexLength)) {
      const computed = createHash(algorithm).update(password).digest();
      let storedBuffer;
      try {
        storedBuffer = Buffer.from(storedHash, "hex");
      } catch (error) {
        continue;
      }
      if (storedBuffer.length === computed.length && timingSafeEqual(storedBuffer, computed)) {
        return true;
      }
    }

    if (base64Length && isBase64StringOfLength(storedHash, base64Length)) {
      const computed = createHash(algorithm).update(password).digest();
      let storedBuffer;
      try {
        storedBuffer = Buffer.from(storedHash, "base64");
      } catch (error) {
        continue;
      }
      if (storedBuffer.length === computed.length && timingSafeEqual(storedBuffer, computed)) {
        return true;
      }
    }
  }

  return false;
};

const updatePasswordHash = async (userId, password) => {
  const passwordHash = await hashPassword(password);
  await pool.execute("UPDATE users SET password_hash = :passwordHash WHERE id = :id", {
    passwordHash,
    id: userId,
  });
};

export const findUserByEmail = async (email) => {
  const normalisedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
  const users = await query("SELECT * FROM users WHERE email = :email", { email: normalisedEmail });
  return users[0];
};

export const findUserById = async (id) => {
  const users = await query("SELECT id, name, email, phone, role, created_at FROM users WHERE id = :id", { id });
  return users[0];
};

export const createUser = async ({ name, email, password, phone, role = "customer" }) => {
  const passwordHash = await hashPassword(password);
  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = phone ? String(phone).trim() : null;
  const normalizedRole = role === "admin" ? "admin" : "customer";
  const [result] = await pool.execute(
    "INSERT INTO users (name, email, password_hash, phone, role) VALUES (:name, :email, :passwordHash, :phone, :role)",
    { name: normalizedName, email: normalizedEmail, passwordHash, phone: normalizedPhone, role: normalizedRole }
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

  if (matchesLegacyHash(user.password_hash, password)) {
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
