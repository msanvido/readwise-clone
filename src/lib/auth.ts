import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import getDb from "./db";
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

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
    .get(payload.userId) as User | undefined;
  return user || null;
}

export async function createUser(
  email: string,
  name: string,
  password: string
): Promise<User> {
  const db = getDb();
  const id = uuid();
  const passwordHash = await hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)"
  ).run(id, email, name, passwordHash);
  return { id, email, name, created_at: new Date().toISOString() };
}

export async function loginUser(
  email: string,
  password: string
): Promise<User | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | (User & { password_hash: string })
    | undefined;
  if (!row) return null;

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;

  return { id: row.id, email: row.email, name: row.name, created_at: row.created_at };
}
