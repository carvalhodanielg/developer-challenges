import type { Request, Response } from 'express';
import { AUTH_COOKIE_NAME, authCookieOptions } from '../../config/auth';
import { env } from '../../config/env';
import type { LoginInput } from './auth.schemas';
import * as authService from './auth.service';

const cookieOptions = authCookieOptions(env);

export async function login(req: Request, res: Response) {
  const { user, token } = await authService.login(req.body as LoginInput);
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  // clearCookie must receive the same path/sameSite/secure to match the cookie.
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
  res.status(204).end();
}

export function me(req: Request, res: Response) {
  const user = authService.verifyToken(req.cookies?.[AUTH_COOKIE_NAME]);
  res.json({ user });
}
