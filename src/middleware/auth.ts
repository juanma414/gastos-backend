import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthPayload = {
  sub: string;
  role: "ADMIN" | "MEMBER";
  email: string;
  name: string;
};

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function parseAuthToken(authorizationHeader?: string): AuthPayload | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const payload = parseAuthToken(req.header("authorization"));
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.auth = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.auth.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
