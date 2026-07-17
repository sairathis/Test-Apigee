import { Request, Response, NextFunction } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  if (err?.code === "P2002") {
    return res.status(409).json({ error: "A record with this unique value already exists.", meta: err.meta });
  }
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }
  const status = err?.status || 500;
  res.status(status).json({ error: err?.message || "Internal server error" });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
