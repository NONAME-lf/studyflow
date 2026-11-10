# Специфікація реалізації StudyFlow

Мета — прототип для етапу 4 (обсяг спринтів 1–3), без зайвої складності. Якщо щось тут суперечить здоровому глузду під час реалізації — спитай, не мовчки змінюй.

## 1. Модель даних (Prisma, орієнтир)

8 таблиць — достатньо для змістовної ER-схеми.

```prisma
enum GroupRole  { HEADMAN MEMBER }
enum Priority   { LOW MEDIUM HIGH }
enum TaskStatus { TODO IN_PROGRESS DONE }

model User {
  id                 String   @id @default(uuid())
  email              String   @unique
  passwordHash       String
  fullName           String
  refreshTokenHash   String?
  reminderEnabled    Boolean  @default(true)   // US-24 (UI — спринт 4)
  reminderDaysBefore Int      @default(1)      // US-24
  createdAt          DateTime @default(now())
  // relations: memberships, ownedDeadlines, completions, assignedTasks, createdTasks, reminderLogs
}

model Group {
  id         String   @id @default(uuid())
  name       String
  inviteCode String   @unique
  createdAt  DateTime @default(now())
}

model GroupMember {
  groupId  String
  userId   String
  role     GroupRole @default(MEMBER)
  joinedAt DateTime  @default(now())
  @@id([groupId, userId])                 // onDelete: Cascade з обох боків
}

model Subject {
  id      String  @id @default(uuid())
  groupId String
  name    String
  teacher String?
  color   String  @default("#3B82F6")
  @@unique([groupId, name])
}

model Deadline {
  id          String   @id @default(uuid())
  title       String
  description String?
  dueAt       DateTime
  priority    Priority @default(MEDIUM)
  ownerId     String            // автор
  groupId     String?           // null = особистий дедлайн
  subjectId   String?           // груповий: предмет цієї групи; особистий: предмет групи автора (US-11)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([groupId, dueAt])
  @@index([ownerId, dueAt])
}

model DeadlineCompletion {          // особиста відмітка виконання (US-14)
  deadlineId  String
  userId      String
  completedAt DateTime @default(now())
  @@id([deadlineId, userId])
}

model Task {                        // канбан командних задач (US-19/20)
  id          String     @id @default(uuid())
  groupId     String
  title       String
  description String?
  status      TaskStatus @default(TODO)
  position    Int        @default(0)
  assigneeId  String?
  deadlineId  String?               // прив'язка до дедлайну
  createdById String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model ReminderLog {                 // ідемпотентність нагадувань (US-23)
  deadlineId String
  userId     String
  sentAt     DateTime @default(now())
  @@id([deadlineId, userId])
}
```

## 2. Бізнес-правила (на них будуються модульні тести)

**Auth**
- A1. Email унікальний (нормалізується до lower-case) → дубль = `409`.
- A2. Пароль ≥ 8 символів; зберігається лише bcrypt-хеш.
- A3. Невірний email або пароль → `401` з однаковим повідомленням (не розкриваємо, чи існує email).
- A4. Refresh: валідний токен + збіг хешу → нова пара токенів (ротація); інакше `401`. Logout обнуляє `refreshTokenHash`.

**Групи**
- G1. Творець групи стає `HEADMAN`.
- G2. Інвайт-код: 8 символів з алфавіту `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (без 0/O/1/I), унікальний; при колізії — повторна генерація.
- G3. Приєднання: невідомий код → `404`; вже учасник → `409`; новий учасник — `MEMBER`.
- G4. Лише `HEADMAN`: перегенерувати код, змінити роль, видалити учасника, CRUD предметів, CRUD групових дедлайнів.
- G5. У групі завжди ≥ 1 `HEADMAN`: понизити або видалити останнього старосту, чи вийти йому з групи → `400`.
- G6. Будь-який учасник може вийти з групи сам (крім G5).
- G7. Не-учасник групи → `403` на будь-який ендпоінт групи (або `404`, щоб не розкривати існування — обрати одне й тримати скрізь).

**Дедлайни**
- D1. Особистий (`groupId = null`) бачить і редагує лише автор.
- D2. Груповий створює/редагує/видаляє лише `HEADMAN` групи; бачать усі учасники.
- D3. `subjectId` групового дедлайну — предмет тієї самої групи; особистого — предмет будь-якої групи, де автор є учасником (US-11, погоджено 10.11). Інакше `400`.
- D4. Статус для конкретного користувача обчислюється: `done` (є completion), `overdue` (не done і `dueAt < now`), `pending`.
- D5. Список: лише видимі користувачу (особисті + груп, де він учасник); фільтри `from`, `to`, `groupId`, `subjectId`, `status`; сортування `dueAt ASC`.
- D6. Відмітка виконання ідемпотентна (повторна — без помилки); для невидимого дедлайну → `404`.
- D7. Прогрес групового дедлайну = виконали / учасників групи, ціле `%`; 0 учасників → 0 %.

**Задачі (канбан)**
- K1. Задачі належать групі; створювати/переміщати може будь-який учасник.
- K2. Статуси `TODO → IN_PROGRESS → DONE` (дозволено будь-який перехід, drag-and-drop); `position` — порядок у колонці.
- K3. `assigneeId` має бути учасником групи → інакше `400`. Видаляє автор задачі або `HEADMAN`.

**Нагадування**
- R1. Job вибирає пари (користувач, дедлайн): дедлайн видимий користувачу, не виконаний ним, `now ≤ dueAt ≤ now + reminderDaysBefore днів`, `reminderEnabled = true`, немає запису в `ReminderLog`.
- R2. Для кожної пари — один лист і запис у `ReminderLog` (повторний запуск job не шле дублікатів).
- R3. Помилка відправки одного листа не зупиняє решту (логувати).
- R4. Cron з env (`REMINDER_CRON`, за замовчуванням щогодини); у dev є ручний запуск для демо.

## 3. REST API (`/api`, Swagger на `/api/docs`)

| Метод | Шлях | Доступ | Опис | Беклог |
|---|---|---|---|---|
| POST | /auth/register | публічний | Реєстрація | US-01 |
| POST | /auth/login | публічний | Вхід → `{accessToken, user}` + refresh-cookie | US-02 |
| POST | /auth/refresh | refresh-cookie | Нова пара токенів | US-02 |
| POST | /auth/logout | auth | Вихід | US-02 |
| GET | /auth/me | auth | Поточний користувач | US-02 |
| PATCH | /users/me | auth | Ім'я | US-04 |
| PATCH | /users/me/password | auth | Зміна пароля (потрібен старий) | US-04 |
| GET, PATCH | /users/me/reminder-settings | auth | Налаштування нагадувань | US-24 (спринт 4) |
| GET | /users/me/stats | auth | Вчасно / із запізненням / пропущено | US-28 (спринт 4) |
| POST | /groups | auth | Створити групу | US-06 |
| GET | /groups | auth | Мої групи + моя роль | US-06 |
| GET | /groups/:groupId | учасник | Деталі групи | US-09 |
| POST | /groups/join | auth | Приєднатися за кодом | US-07 |
| POST | /groups/:groupId/invite-code | HEADMAN | Перегенерувати код | US-07 |
| GET | /groups/:groupId/members | учасник | Учасники | US-09 |
| PATCH | /groups/:groupId/members/:userId | HEADMAN | Змінити роль | US-08, US-09 |
| DELETE | /groups/:groupId/members/:userId | HEADMAN або сам | Видалити / вийти | US-09 |
| GET | /groups/:groupId/subjects | учасник | Предмети | US-10 |
| POST | /groups/:groupId/subjects | HEADMAN | Створити предмет | US-10 |
| PATCH, DELETE | /groups/:groupId/subjects/:subjectId | HEADMAN | Змінити / видалити | US-10 |
| GET | /deadlines | auth | Видимі дедлайни, фільтри `from,to,groupId,subjectId,status` | US-13, US-16, US-17 |
| POST | /deadlines | auth | Особистий дедлайн | US-11 |
| POST | /groups/:groupId/deadlines | HEADMAN | Груповий дедлайн | US-12 |
| GET | /deadlines/:id | видимий | Деталі | US-11 |
| PATCH, DELETE | /deadlines/:id | автор / HEADMAN | Змінити / видалити | US-11, US-12 |
| PUT | /deadlines/:id/completion | видимий | Відмітити виконаним | US-14 |
| DELETE | /deadlines/:id/completion | видимий | Зняти відмітку | US-14 |
| GET | /deadlines/:id/progress | учасник групи | `{total, completed, percent}` | US-27 |
| GET | /groups/:groupId/tasks | учасник | Задачі канбану | US-19, US-20 |
| POST | /groups/:groupId/tasks | учасник | Створити задачу | US-20 |
| PATCH | /tasks/:id | учасник | Статус, позиція, виконавець, поля | US-20, US-21 |
| DELETE | /tasks/:id | автор / HEADMAN | Видалити | US-20 |
| POST | /dev/reminders/run | лише `NODE_ENV=development` | Ручний запуск нагадувань (демо) | US-23 |
| GET | /health | публічний | Health-check | T-02 |

Помилки — стандартний формат NestJS `{statusCode, message, error}`. Кожен ендпоінт — з `@ApiOperation`, `@ApiResponse` (успіх + типові помилки), DTO з `@ApiProperty` і прикладами, `@ApiBearerAuth`, теги за модулями.

## 4. Frontend (українською)

| Маршрут | Зміст | Беклог |
|---|---|---|
| `/login`, `/register` | Форми з валідацією (zod), помилки з API | US-03 |
| `/dashboard` | Найближчі дедлайни: фільтри (предмет, статус, група), швидке додавання особистого, чекбокс виконання, бейджі overdue | US-13, US-14, US-15 |
| `/calendar` | Тиждень (за замовчуванням, Пн–Нд) / місяць; колір предмета; клік — деталі | US-16, US-17 |
| `/groups` | Мої групи, створити, приєднатися за кодом | US-06, US-07 |
| `/groups/[groupId]` | Вкладки: Дедлайни (групові + прогрес-бар; створення — лише староста), Предмети, Учасники (код запрошення — лише староста) | US-09, US-10, US-12, US-27 |
| `/groups/[groupId]/board` | Канбан TODO / В роботі / Готово, drag-and-drop | US-19, US-21 |
| `/profile` | Ім'я, зміна пароля; (спринт 4 — налаштування нагадувань, статистика) | US-04 |

- Layout: бічна навігація, адаптивність (мобільна ширина), toasts, стани loading / empty / error (T-04).
- Auth на клієнті: access-токен у пам'яті (context), при `401` — тихий refresh через cookie, далі повтор запиту; middleware Next.js редіректить на `/login`, якщо немає refresh-cookie.
- UI за роллю: кнопки старости ховаються для `MEMBER` (але сервер усе одно перевіряє).
- `data-testid` на ключових елементах — для E2E і скріншотів.

## 5. Сид-дані для демо (`pnpm db:seed`)

- Група «МІ-41» з предметами: «Інформаційні технології», «Прикладні алгоритми», «Англійська мова (ESP)», «Бази даних».
- Користувачі (пароль для всіх `Demo1234!`):
  - `starosta@studyflow.dev` — Петров Богдан, HEADMAN;
  - `artem@studyflow.dev` — Мекшаков Артемій, MEMBER;
  - `olena@studyflow.dev`, `andrii@studyflow.dev` — вигадані учасники, MEMBER.
- 8–10 дедлайнів відносно дати запуску сиду: групові на поточний і наступний тиждень, 1 прострочений, 2 особисті; частина вже відмічена виконаною (щоб прогрес був ненульовий, напр. 2/4 = 50 %).
- 6–8 задач канбану в різних колонках з виконавцями.
- Сид ідемпотентний (перезапуск не дублює).

## 6. Конфігурація

`apps/api/.env.example` (копіюється в `apps/api/.env`):

```
DATABASE_URL=postgresql://studyflow:studyflow@localhost:5433/studyflow
DATABASE_URL_TEST=postgresql://studyflow:studyflow@localhost:5433/studyflow_test
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM="StudyFlow <no-reply@studyflow.dev>"
REMINDER_CRON=0 * * * *
APP_URL=http://localhost:3000
API_PORT=3001
```

`docker-compose.yml`: `postgres:16` (5433:5432, volume, init-скрипт створює `studyflow_test`), `axllent/mailpit` (1025, 8025); профіль `full` — `api` і `web` з Dockerfile (T-02).
