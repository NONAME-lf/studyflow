/**
 * Demo data (docs/domain-and-api.md §5). Idempotent: users, group, members and subjects are
 * upserted by natural keys, deadlines and tasks by fixed ids; dates are shifted relative to now.
 */
import { existsSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { GroupRole, Priority, PrismaClient, TaskStatus } from '../src/generated/prisma/client.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_PASSWORD = 'Demo1234!';
const INVITE_CODE = 'STUDY424';
// Wider than the default 1 day, so the live demo of reminders (US-23) always has letters to show.
const DEMO_REMINDER_DAYS = 3;

const USERS = {
  starosta: { email: 'starosta@studyflow.dev', fullName: 'Петров Богдан', role: GroupRole.HEADMAN },
  artem: { email: 'artem@studyflow.dev', fullName: 'Мекшаков Артемій', role: GroupRole.MEMBER },
  olena: { email: 'olena@studyflow.dev', fullName: 'Коваль Олена', role: GroupRole.MEMBER },
  andrii: { email: 'andrii@studyflow.dev', fullName: 'Мельник Андрій', role: GroupRole.MEMBER },
} as const;
type UserKey = keyof typeof USERS;

const SUBJECTS = {
  it: { name: 'Інформаційні технології', color: '#3B82F6' },
  algo: { name: 'Прикладні алгоритми', color: '#10B981' },
  esp: { name: 'Англійська мова (ESP)', color: '#F59E0B' },
  db: { name: 'Бази даних', color: '#8B5CF6' },
} as const;
type SubjectKey = keyof typeof SUBJECTS;

/** Date `days` from today at hh:mm local time. */
function at(days: number, hours: number, minutes = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const id = (n: number) => `5eed0000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

interface DeadlineSeed {
  id: string;
  title: string;
  description?: string;
  dueAt: Date;
  priority: Priority;
  owner: UserKey;
  personal?: boolean;
  subject?: SubjectKey;
  doneBy?: UserKey[];
}

const DEADLINES: DeadlineSeed[] = [
  {
    id: id(101),
    title: 'Етап 4: звіт і демо-презентація',
    description: 'Звіт у Classroom, захист на ЛР.',
    dueAt: at(2, 22, 59),
    priority: Priority.HIGH,
    owner: 'starosta',
    subject: 'it',
    doneBy: ['artem', 'olena'],
  },
  {
    id: id(102),
    title: 'ЛР 5: динамічне програмування',
    dueAt: at(4, 23, 59),
    priority: Priority.MEDIUM,
    owner: 'starosta',
    subject: 'algo',
    doneBy: ['artem'],
  },
  {
    id: id(103),
    title: 'Essay: My future career',
    dueAt: at(6, 18),
    priority: Priority.LOW,
    owner: 'starosta',
    subject: 'esp',
  },
  {
    id: id(104),
    title: 'ЛР 3: нормалізація схеми БД',
    dueAt: at(9, 23, 59),
    priority: Priority.MEDIUM,
    owner: 'starosta',
    subject: 'db',
  },
  {
    id: id(105),
    title: 'Модульна контрольна робота',
    dueAt: at(11, 10),
    priority: Priority.HIGH,
    owner: 'starosta',
    subject: 'db',
  },
  {
    id: id(106),
    title: 'ДЗ: асимптотичний аналіз',
    dueAt: at(-2, 23, 59),
    priority: Priority.MEDIUM,
    owner: 'starosta',
    subject: 'algo',
    doneBy: ['starosta', 'olena'],
  },
  {
    id: id(107),
    title: 'Підготуватися до співбесіди',
    dueAt: at(3, 15),
    priority: Priority.MEDIUM,
    owner: 'artem',
    personal: true,
  },
  {
    id: id(108),
    title: 'Оновити резюме',
    dueAt: at(5, 20),
    priority: Priority.LOW,
    owner: 'starosta',
    personal: true,
  },
];

interface TaskSeed {
  id: string;
  title: string;
  status: TaskStatus;
  position: number;
  assignee?: UserKey;
  deadline?: string;
}

const TASKS: TaskSeed[] = [
  {
    id: id(201),
    title: 'Налаштувати CI',
    status: TaskStatus.DONE,
    position: 0,
    assignee: 'starosta',
  },
  {
    id: id(202),
    title: 'Схема БД і міграції',
    status: TaskStatus.DONE,
    position: 1,
    assignee: 'starosta',
  },
  {
    id: id(203),
    title: 'Сторінки входу та реєстрації',
    status: TaskStatus.IN_PROGRESS,
    position: 0,
    assignee: 'artem',
  },
  {
    id: id(204),
    title: 'Календар тижня',
    status: TaskStatus.IN_PROGRESS,
    position: 1,
    assignee: 'artem',
  },
  {
    id: id(205),
    title: 'E-mail-нагадування',
    status: TaskStatus.TODO,
    position: 0,
    assignee: 'starosta',
    deadline: id(101),
  },
  {
    id: id(206),
    title: 'Звіт етапу 4',
    status: TaskStatus.TODO,
    position: 1,
    assignee: 'artem',
    deadline: id(101),
  },
  {
    id: id(207),
    title: 'Сценарій живого демо',
    status: TaskStatus.TODO,
    position: 2,
    assignee: 'olena',
    deadline: id(101),
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = {} as Record<UserKey, string>;
  for (const [key, user] of Object.entries(USERS) as [UserKey, (typeof USERS)[UserKey]][]) {
    const { id: userId } = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        fullName: user.fullName,
        passwordHash,
        reminderDaysBefore: DEMO_REMINDER_DAYS,
      },
      update: {
        fullName: user.fullName,
        passwordHash,
        refreshTokenHash: null,
        reminderEnabled: true,
        reminderDaysBefore: DEMO_REMINDER_DAYS,
      },
    });
    users[key] = userId;
  }

  const group = await prisma.group.upsert({
    where: { inviteCode: INVITE_CODE },
    create: { name: 'МІ-41', inviteCode: INVITE_CODE },
    update: { name: 'МІ-41' },
  });

  for (const [key, user] of Object.entries(USERS) as [UserKey, (typeof USERS)[UserKey]][]) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: users[key] } },
      create: { groupId: group.id, userId: users[key], role: user.role },
      update: { role: user.role },
    });
  }

  const subjects = {} as Record<SubjectKey, string>;
  for (const [key, subject] of Object.entries(SUBJECTS) as [
    SubjectKey,
    (typeof SUBJECTS)[SubjectKey],
  ][]) {
    const { id: subjectId } = await prisma.subject.upsert({
      where: { groupId_name: { groupId: group.id, name: subject.name } },
      create: { groupId: group.id, name: subject.name, color: subject.color },
      update: { color: subject.color },
    });
    subjects[key] = subjectId;
  }

  for (const d of DEADLINES) {
    const data = {
      title: d.title,
      description: d.description ?? null,
      dueAt: d.dueAt,
      priority: d.priority,
      ownerId: users[d.owner],
      groupId: d.personal ? null : group.id,
      subjectId: d.subject ? subjects[d.subject] : null,
    };
    await prisma.deadline.upsert({
      where: { id: d.id },
      create: { id: d.id, ...data },
      update: data,
    });
  }

  // Completions and reminder logs of demo deadlines are recreated to get a predictable state.
  const deadlineIds = DEADLINES.map((d) => d.id);
  await prisma.deadlineCompletion.deleteMany({ where: { deadlineId: { in: deadlineIds } } });
  await prisma.reminderLog.deleteMany({ where: { deadlineId: { in: deadlineIds } } });
  await prisma.deadlineCompletion.createMany({
    data: DEADLINES.flatMap((d) =>
      (d.doneBy ?? []).map((user) => ({ deadlineId: d.id, userId: users[user] })),
    ),
  });

  for (const t of TASKS) {
    const data = {
      groupId: group.id,
      title: t.title,
      status: t.status,
      position: t.position,
      assigneeId: t.assignee ? users[t.assignee] : null,
      deadlineId: t.deadline ?? null,
      createdById: users.starosta,
    };
    await prisma.task.upsert({ where: { id: t.id }, create: { id: t.id, ...data }, update: data });
  }

  console.log(
    `Seed done: ${Object.keys(USERS).length} users, group "МІ-41" (invite code ${INVITE_CODE}), ` +
      `${Object.keys(SUBJECTS).length} subjects, ${DEADLINES.length} deadlines, ${TASKS.length} tasks. ` +
      `Password for all demo users: ${DEMO_PASSWORD}`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
