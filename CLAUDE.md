# StudyFlow — контекст для Claude Code

Командний проєкт з дисципліни «Інформаційні технології», Модуль 2. КНУ імені Тараса Шевченка, ФКНК, 4 курс, група МІ-41. Викладач — Максим Мокрієв.

Команда (2 особи):
- **Петров Богдан** — Team Lead, Backend (NestJS), архітектура, БД, Docker/CI, модульні тести, Swagger.
- **Мекшаков Артемій** — Product Owner, Frontend (Next.js), UI/UX, інтеграційні та E2E-тести, звіти й презентації.

Продукт: **StudyFlow** — вебзастосунок-планувальник навчальних дедлайнів для студентських груп. Ключова ідея: староста створює дедлайн один раз — він з'являється в календарі кожного учасника групи; кожен відмічає виконання окремо, староста бачить прогрес групи.

## Правила роботи (обов'язково)

- **Ніколи не виконуй `git commit`, `git push`, `git tag`, не створюй PR.** Готуй зміни, коротко пиши, що змінено, пропонуй текст коміту — і зупиняйся. Комітить Богдан сам.
- Спілкування українською, коротко, по суті. Дія замість довгих пояснень.
- Код, ідентифікатори, коментарі, тексти комітів — англійською. Інтерфейс, звіти, презентації — українською.
- **Не вигадуй фактів для звітів.** Кількість тестів, статуси, час, coverage, дати, що зроблено/не зроблено — тільки з реальних прогонів, `git log`, Notion. Якщо даних немає — спитай.
- Перед зміною обсягу (викинути або додати фічу з беклогу) — спитай.
- Після кожного логічного блоку: `pnpm lint && pnpm typecheck && pnpm test` мають бути зеленими.
- Узгоджуйся з рішеннями етапів 0–3 (`docs/project-brief.md`): назви, ролі, цифри, ID беклогу. Викладач їх уже бачив.

## Документи

| Файл | Що там |
|---|---|
| `docs/project-brief.md` | Продукт, Lean Canvas, roadmap, RACI, ризики, DoD — підсумок етапів 0–3 |
| `docs/backlog.md` | Беклог (45 елементів), обсяг семестру, ID карток (US-xx, T-xx, D-xx) |
| `docs/domain-and-api.md` | **Специфікація реалізації**: модель даних, бізнес-правила, ендпоінти, сторінки, сид |
| `docs/stage4.md` | Вимоги етапу 4 (дедлайн **15.11.2026 22:59**), тест-план, структура звіту, презентації, демо |
| `docs/stage5.md` | Етап 5 (01.12.2026): деплой, фінальний звіт, фінальна презентація |
| `docs/defense-guide-format.md` | Формат гайда захисту (коротко!) |
| `docs/previous-stages/*.pdf` | Здані звіти етапів 0–3 і гайд захисту 2–3 |
| `reports/` | LaTeX-звіти: `preamble.tex` — спільний стиль; `stage0–3.tex` — зразки; `stage4.tex`, `stage4-slides.tex` — шаблони |

## Технічні рішення (зафіксовані; відхилення — лише з обґрунтуванням і після питання)

- **Monorepo, pnpm workspaces:** `apps/api` (NestJS), `apps/web` (Next.js, App Router). TypeScript strict скрізь. Останні стабільні версії.
- **БД:** PostgreSQL 16 у Docker Compose (порт хоста **5433**, щоб не конфліктувати з локальним Postgres). ORM **Prisma** — схема як єдине джерело правди, міграції, сид.
- **Архітектура API:** модульний моноліт, шари Controller → Service → Prisma. Модулі: `auth`, `users`, `groups`, `subjects`, `deadlines`, `tasks`, `reminders`, `mail`, `health`. Глобальний префікс `/api`.
- **Автентифікація:** JWT. Access (15 хв) — у тілі відповіді, зберігається в пам'яті клієнта. Refresh (7 днів) — httpOnly cookie, ротація, у БД зберігається лише хеш. Паролі — bcrypt.
- **Same-origin:** Next.js `rewrites` проксює `/api/*` → `http://localhost:3001/api/*` (cookie працюють без CORS-проблем).
- **Ролі в групі:** `HEADMAN` (староста) / `MEMBER`. Перевірка — `GroupRoleGuard` + декоратор `@GroupRoles(...)`.
- **Валідація:** DTO + class-validator, глобальний `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`.
- **Нагадування:** `@nestjs/schedule` (cron з env) + Nodemailer → **Mailpit** у dev (UI на :8025 — показуємо на демо). `ReminderLog` — захист від повторних листів. Dev-ендпоінт для ручного запуску.
- **API-документація:** `@nestjs/swagger`, UI на `/api/docs`, експорт `docs/api/openapi.json`. Типи для фронтенду генеруються з OpenAPI (`openapi-typescript`) — це наші «спільні типи».
- **Frontend:** Tailwind CSS + shadcn/ui, TanStack Query, react-hook-form + zod, date-fns (локаль `uk`, тиждень з понеділка), dnd-kit для канбану.
- **Тести:** Jest (unit, Prisma мокається через `jest-mock-extended`), Jest + supertest (інтеграційні, справжня тестова БД `studyflow_test`, пошта — in-memory stub), Playwright (E2E + скріншоти для звіту). Звіти прогонів у JSON → LaTeX-таблиці.
- **Якість:** ESLint + Prettier. CI — GitHub Actions: lint, typecheck, unit, integration (postgres service), build.
- **UML:** PlantUML (`docs/uml/*.puml`) → PNG через Docker-образ `plantuml/plantuml`.
- **Звіти:** LaTeX, XeLaTeX, `reports/preamble.tex`; презентації — Beamer `metropolis` (див. `reports/stage1-slides.tex`).

## Структура репозиторію (цільова)

```
apps/api/            NestJS: src/<module>/, prisma/schema.prisma, prisma/seed.ts, test/ (integration)
apps/web/            Next.js: app/, components/, lib/api (згенеровані типи), e2e/ (Playwright)
docs/                специфікація, вимоги етапів, uml/, api/openapi.json
reports/             LaTeX: stage4.tex, stage4-slides.tex, img/, generated/ (таблиці з тестів), build.sh
scripts/             test-report (JSON → .tex), screenshots, uml render
docker-compose.yml   postgres (5433), mailpit (1025 SMTP, 8025 UI)
.github/workflows/   ci.yml
```

## Команди (створити в першій фазі, тримати актуальними тут)

```
docker compose up -d          # postgres + mailpit
pnpm install
pnpm db:migrate | db:seed | db:reset
pnpm dev                      # api :3001, web :3000
pnpm lint | typecheck
pnpm test                     # unit (api)
pnpm test:int                 # integration (api + studyflow_test)
pnpm test:e2e                 # Playwright (потребує запущених api+web+сиду)
pnpm test:report              # прогони з JSON-виводом → reports/generated/*.tex
pnpm openapi:export           # → docs/api/openapi.json (+ генерація типів для web)
pnpm uml                      # docs/uml/*.puml → docs/uml/out/*.png
pnpm screenshots              # Playwright → reports/img/*.png
cd reports && ./build.sh stage4   # PDF
```

## Трасованість (для звітів і захисту)

- Кожна фіча прив'язана до ID з беклогу. Гілки: `feature/US-11-personal-deadlines`. Коміти (пропонуй текстом): `feat(deadlines): personal deadlines CRUD [US-11]`.
- Бекенд-задачі за RACI — Богдан, фронтенд — Артемій (див. `docs/backlog.md`, колонка «Виконавець»).
- Notion (дошка проєкту): сторінка `https://app.notion.com/p/407f9bfd7ad1811cabd9d0e776d3f208`, база «StudyFlow — Беклог» `091bd89588364511aaf2209606ac9176`, data source `collection://e4a4255c-e4ff-43a5-b63e-ee10147329c8`. Поля: Status (Backlog / To Do / In Progress / Review / Done), Спринт, Виконавець, Story points. Якщо Notion MCP підключений — оновлюй статуси після завершення фічі; якщо ні — у підсумку перелічуй, які картки перевести і куди.

## Definition of Done модуля (обіцяно викладачу на етапі 3)

- усі Must-елементи спринтів 1–3 у Done;
- ≥20 модульних тестів проходять у CI, є журнал результатів;
- інтеграційні/E2E-тести покривають сценарій: реєстрація → створення групи → груповий дедлайн → відмітка виконання;
- Swagger доступний за `/api/docs`;
- UML (use case, class, sequence) та ER-схема — у звіті;
- demo-версія розгорнута за публічним посиланням (це вже етап 5, до 01.12).
