# Старт етапу 4 у Claude Code

## 0. Один раз (macOS)

- Node.js 22+ (`brew install node`) і pnpm: `corepack enable`
- Docker Desktop (запущений)
- MacTeX для звітів: `brew install --cask mactex-no-gui` (XeLaTeX, metropolis, pgfgantt і шрифти DejaVu вже всередині)
- Приватний репозиторій на GitHub, Артемій — collaborator
- Опційно — Notion у Claude Code, щоб він сам оновлював статуси карток: `claude mcp add --transport http notion https://mcp.notion.com/mcp`

```bash
cd ~/Projects && unzip studyflow-context.zip && cd studyflow
git init && git add . && git commit -m "docs: project context for stage 4"
claude
```

## 1. Промпти по черзі

Кожну фазу — окремим повідомленням. Після кожної: переглянути зміни → закомітити самому → наступна фаза. Фазу 0 — у plan mode (Shift+Tab).

**P0 · План**
> Прочитай CLAUDE.md і всі файли в docs/. Склади план реалізації етапу 4 по днях до 15.11 22:59 за фазами P1–P10 з KICKOFF.md, з ризиками. Нічого не створюй, поки я не підтверджу.

**P1 · Каркас** (T-01, T-02, T-03)
> Фаза 1: pnpm workspaces (apps/api NestJS, apps/web Next.js), ESLint + Prettier, docker-compose (postgres на 5433 + init studyflow_test, mailpit), Prisma-схема з docs/domain-and-api.md §1 + міграція, ідемпотентний сид §5, /api/health, Swagger на /api/docs, rewrites /api у Next.js, GitHub Actions CI, .env.example, README.md (запуск і демо-акаунти). Онови «Команди» в CLAUDE.md. Перевір: docker compose up, db:reset, dev, lint, typecheck. Дай перелік змін і текст коміту.

**P2 · Auth і групи (API)** (US-01, 02, 04, 06–09)
> Фаза 2: модулі auth (A1–A4), users/me, groups + members + invite code + GroupRoleGuard (G1–G7) за docs/domain-and-api.md. Повні Swagger-описи. Модульні тести UT-01…UT-19 з docs/stage4.md (назва тесту починається з ID). lint/typecheck/test — зелені.

**P3 · Предмети, дедлайни, прогрес (API)** (US-10–14, US-27)
> Фаза 3: subjects, deadlines (D1–D7), completion, progress + UT-20…UT-28. Онови сид, якщо треба.

**P4 · Web: ядро** (T-04, US-03, 06, 07, 09, 10, 12–16, 27)
> Фаза 4: pnpm openapi:export + генерація типів; layout, login/register, дашборд, групи, сторінка групи (дедлайни з прогресом, предмети, учасники), календар тижня — за docs/domain-and-api.md §4. data-testid на ключових елементах. Перевір руками на сид-даних обома акаунтами.

**P5 · Канбан, нагадування, місяць, профіль** (US-04, 17, 19–21, 23)
> Фаза 5: tasks API (K1–K3) + канбан з dnd-kit; reminders (R1–R4: cron, Nodemailer → Mailpit, POST /api/dev/reminders/run); календар місяця; профіль. UT-29…UT-34.

**P6 · Інтеграційні, E2E, журнали тестів** (T-06, T-07)
> Фаза 6: IT-01…IT-13 (тестова БД, stub пошти), E2E-01…E2E-03 (Playwright), pnpm test:report → reports/data/*.json і reports/generated/*.tex за docs/stage4.md. Integration — у CI. Прожени все і дай підсумок цифрами.

**P7 · UML, ER, скріншоти** (T-05, T-08)
> Фаза 7: PlantUML у docs/uml/ (use case, class, sequence-group-deadline, sequence-reminders, state, component, deployment, er) — строго за реальним кодом; pnpm uml (Docker plantuml/plantuml) → docs/uml/out/*.png. pnpm screenshots на свіжому сиді → reports/img/ (dashboard, calendar-week, group, board, swagger, mailpit).

*Скріншот Notion (вид «Спринти») → `reports/img/notion-sprints.png` — зробити самому після оновлення статусів.*

**P8 · Звіт**
> Фаза 8: заповни reports/stage4.tex за docs/stage4.md. Тільки факти: git log, реальні прогони, Notion. Для рефлексії спершу постав мені 5–6 коротких питань. Збери ./build.sh stage4 — без [TODO] і переповнень, перевір PDF візуально.

**P9 · Презентація і гайд захисту**
> Фаза 9: reports/stage4-slides.tex (12–14 слайдів) і reports/guide-stage4.tex за docs/defense-guide-format.md (≤ 3 стор., стиль guide-stages-2-3.tex). Збери обидва PDF.

**P10 · Фінальна перевірка**
> Фінал: онови статуси в Notion (або дай список «картка → статус»), пройди чекліст з docs/stage4.md, перелічи, що не готово. Запропонуй текст фінального коміту.

## 2. Графік до здачі

| День | Фази |
|---|---|
| Вт 10.11 (вечір) | P0, P1 |
| Ср 11.11 | P2, P3 |
| Чт 12.11 | P4 |
| Пт 13.11 | P5, P6 |
| Сб 14.11 | P7, P8 |
| Нд 15.11 | P9, P10 → PDF звіту в Classroom (краще до 20:00, дедлайн 22:59) |

Фронтенд (P4–P5) за RACI — зона Артемія: якщо він виконує ці фази у своїй гілці зі свого акаунта, історія git збігається з RACI і рефлексією.

## 3. Етап 5

Після захисту етапу 4: `docs/stage5.md` (деплой, US-24, US-28, фінальний звіт і презентація, 01.12).
