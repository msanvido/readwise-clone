import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, firstRow } from "./db";
import { v4 as uuid } from "uuid";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "readwise-clone-dev-secret-change-in-production"
);

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT id, email, name, created_at FROM users WHERE id = ?",
    args: [payload.userId],
  });
  const row = firstRow(rs);
  if (!row) return null;
  return row as unknown as User;
}

export async function createUser(
  email: string,
  name: string,
  password: string
): Promise<User> {
  const db = await getDb();
  const id = uuid();
  const passwordHash = await hashPassword(password);
  await db.execute({
    sql: "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    args: [id, email, name, passwordHash],
  });
  return { id, email, name, created_at: new Date().toISOString() };
}

export async function loginUser(
  email: string,
  password: string
): Promise<User | null> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });
  const row = firstRow(rs);
  if (!row) return null;

  const valid = await verifyPassword(password, row.password_hash as string);
  if (!valid) return null;

  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    created_at: row.created_at as string,
  };
}
