import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Обёртка для async-роутов: в Express 4 ошибки из промисов не ловятся
 * автоматически, поэтому прокидываем их в next(), а дальше — в общий
 * обработчик ошибок. Избавляет от try/catch в каждом хендлере.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
