import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface User {
      id: number;
    }
  }
}

export function authenticationMiddleware() {
  return function (req: Request, res: Response, next: NextFunction) {
    const header = req.headers["authorization"];

    if (!header) {
      return next();
    }

    if (!header.startsWith("Bearer ")) {
      return res
        .status(400)
        .json({ error: "Authorization header must start with 'Bearer '" });
    }

    const token = header.split(" ")[1];
    if (!token) {
      return res
        .status(400)
        .json({ error: "Token missing from authorization header" });
    }

    const payload = verifyAccessToken(token);
    
    if (payload && payload.userId) {
      req.user = { id: payload.userId };
    }

    return next();
  };
}

export function restrictToAuthenticatedUser() {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return next();
  };
}

export function restrictToSessionHost() {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return next();
  };
}