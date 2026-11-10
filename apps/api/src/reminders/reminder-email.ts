import type { MailMessage } from '../mail/mail.service.js';

export interface ReminderEmailInput {
  to: string;
  fullName: string;
  title: string;
  dueAt: Date;
  subjectName: string | null;
  groupName: string | null;
  appUrl: string;
  /** IANA zone for the date in the letter; undefined → the server's zone. */
  timeZone?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** US-23: Ukrainian reminder letter (plain text + HTML). */
export function reminderEmail(input: ReminderEmailInput): MailMessage {
  const due = new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: input.timeZone,
  }).format(input.dueAt);
  const where = [input.subjectName, input.groupName ?? 'особистий дедлайн']
    .filter(Boolean)
    .join(' · ');
  const link = `${input.appUrl}/dashboard`;

  const text = [
    `Вітаємо, ${input.fullName}!`,
    '',
    `Нагадуємо про дедлайн «${input.title}» (${where}).`,
    `Термін: ${due}.`,
    '',
    `Відкрити StudyFlow: ${link}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="uk"><body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
    <p style="margin:0 0 4px;color:#6b7280;font-size:13px">StudyFlow · нагадування</p>
    <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(input.title)}</h1>
    <p style="margin:0 0 8px">Вітаємо, ${escapeHtml(input.fullName)}!</p>
    <p style="margin:0 0 8px">Термін: <strong>${escapeHtml(due)}</strong></p>
    <p style="margin:0 0 20px;color:#4b5563">${escapeHtml(where)}</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">Відкрити StudyFlow</a>
  </div>
</body></html>`;

  return { to: input.to, subject: `Нагадування: «${input.title}» — ${due}`, text, html };
}
