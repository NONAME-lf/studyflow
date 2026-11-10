import { Prisma } from '../generated/prisma/client.js';

/** P2002 — unique constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
