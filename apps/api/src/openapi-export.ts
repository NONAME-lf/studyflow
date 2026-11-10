import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { buildOpenApiDocument } from './swagger.js';

// Runs from dist/: writes <repo>/docs/api/openapi.json without starting the HTTP server.
const output = resolve(import.meta.dirname, '../../../docs/api/openapi.json');

const app = await NestFactory.create(AppModule, { logger: false });
configureApp(app);
const document = buildOpenApiDocument(app);
await app.close();

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(`OpenAPI document written to ${output}`);
