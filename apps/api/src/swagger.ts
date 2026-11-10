import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Swagger UI: /api/docs, JSON: /api/docs-json. */
export const SWAGGER_PATH = 'api/docs';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('StudyFlow API')
    .setDescription(
      'REST API планувальника навчальних дедлайнів для студентських груп. ' +
        'Захищені ендпоінти потребують access-токена (Authorize → Bearer).',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .addTag('auth', 'Реєстрація, вхід, токени')
    .addTag('users', 'Профіль поточного користувача')
    .addTag('groups', 'Групи, учасники, ролі, коди запрошення')
    .addTag('subjects', 'Предмети групи')
    .addTag('deadlines', 'Особисті й групові дедлайни, відмітка виконання, прогрес')
    .addTag('health', 'Стан сервісу')
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_PATH, app, buildOpenApiDocument(app), {
    customSiteTitle: 'StudyFlow API',
  });
}
