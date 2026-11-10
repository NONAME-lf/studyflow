import { type INestApplication, ValidationPipe } from '@nestjs/common';

export const API_PREFIX = 'api';

/** Shared by main.ts, the OpenAPI export and integration tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
}
