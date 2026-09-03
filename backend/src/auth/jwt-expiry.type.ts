import type { SignOptions } from 'jsonwebtoken';

export type JwtExpiresIn = SignOptions['expiresIn'];

export const asJwtExpiresIn = (value: string): JwtExpiresIn =>
  value as JwtExpiresIn;
