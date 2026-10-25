import multer from 'multer';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

/** Map multer / fileFilter failures to a 400 instead of an unhandled 500. */
export function sendMulterError(res: Response, err: unknown): void {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large'
        : err.message;
    res.status(400).json({ error: message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(400).json({ error: 'Invalid upload' });
}

/** Wrap multer middleware so fileFilter and size-limit errors return 4xx. */
export function wrapMulter(middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err: unknown) => {
      if (err) {
        sendMulterError(res, err);
        return;
      }
      next();
    });
  };
}
