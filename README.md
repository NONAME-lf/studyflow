# StudyFlow

Вебзастосунок-планувальник навчальних дедлайнів для студентських груп. Староста створює дедлайн один раз — він з'являється в календарі кожного учасника групи; кожен відмічає виконання окремо, староста бачить прогрес групи.

Командний проєкт з дисципліни «Інформаційні технології», КНУ імені Тараса Шевченка, ФКНК, група МІ-41: Петров Богдан, Мекшаков Артемій.

**Стек:** NestJS 12 · Prisma 7 · PostgreSQL 16 · Next.js 16 · Tailwind CSS 4 · Vitest · Playwright · Docker Compose · GitHub Actions.

## Запуск

Потрібно: Node.js 22+, pnpm (`corepack enable`), Docker.

```bash
docker compose up -d                     # PostgreSQL :5433 + Mailpit :1025/:8025
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:reset                            # міграції + демо-дані
pnpm dev                                 # api :3001, web :3000
```

| Що | Адреса |
|---|---|
| Застосунок | http://localhost:3000 |
| API | http://localhost:3001/api |
| Swagger UI | http://localhost:3001/api/docs |
| Mailpit (листи) | http://localhost:8025 |

Усе в контейнерах (замість `pnpm dev`): `docker compose --profile full up -d --build`, демо-дані — `docker compose exec api pnpm exec prisma db seed`.

## Демо-акаунти

Пароль для всіх — `Demo1234!`. Група «МІ-41», код запрошення `STUDY424`.

| E-mail | Роль у групі |
|---|---|
| `starosta@studyflow.dev` | староста (Петров Богдан) |
| `artem@studyflow.dev` | учасник (Мекшаков Артемій) |
| `olena@studyflow.dev`, `andrii@studyflow.dev` | учасники |

## Команди

| Команда | Що робить |
|---|---|
| `pnpm dev` | api + web у режимі розробки |
| `pnpm lint` | Prettier (перевірка) + ESLint |
| `pnpm typecheck` | TypeScript в обох застосунках |
| `pnpm test` | модульні тести API (Vitest) |
| `pnpm db:migrate` / `db:seed` / `db:reset` | нова міграція / демо-дані / скидання БД + сид |
| `pnpm openapi:export` | `docs/api/openapi.json` + типи для web |
| `pnpm build` | production-збірка |
| `pnpm format` | форматування Prettier |

## Структура

```
apps/api   NestJS: src/<модуль>/, prisma/ (схема, міграції, сид)
apps/web   Next.js (App Router)
docs/      специфікація, беклог, вимоги етапів, api/openapi.json
reports/   звіти та презентації (LaTeX)
```
