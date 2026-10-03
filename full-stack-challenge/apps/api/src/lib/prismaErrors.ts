import { Prisma } from '../generated/prisma/client';
import { AppError } from '../errors/AppError';

/**
 * Awaits a Prisma write and turns "record not found" (P2025) into a 404 with a
 * resource-specific message. The errorHandler would map P2025 anyway, but only
 * to a generic "Resource not found".
 */
export async function orNotFound<T>(
  operation: Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw AppError.notFound(message);
    }
    throw error;
  }
}
