import { expect, test } from '@playwright/test';
import { localDay, loginViaUi, open, PASSWORD, registerViaUi, uniqueId } from './helpers';

test('E2E-01 register → create a group → group deadline → second user joins by code → marks it done → the headman sees 50 %', async ({
  browser,
}) => {
  const id = uniqueId();
  const title = `Груповий дедлайн ${id}`;

  // Headman: registration, group, deadline.
  const headman = await browser.newPage();
  await registerViaUi(headman, 'Староста Тест', `e2e-head-${id}@studyflow.dev`);
  await headman.getByTestId('nav-groups').click();
  await headman.getByTestId('create-group').click();
  await headman.getByTestId('group-name-input').fill(`E2E ${id}`);
  await headman.getByTestId('create-group-submit').click();
  const code = (await headman.getByTestId('invite-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);

  await headman.getByTestId('create-group-deadline').click();
  await headman.getByTestId('deadline-form-title').fill(title);
  await headman.getByTestId('deadline-form-submit').click();
  const headmanRow = headman.getByTestId('deadline-row').filter({ hasText: title });
  await expect(headmanRow.getByTestId('progress-percent')).toHaveText('0%');

  // Member: registration, join by code, completion mark.
  const member = await browser.newPage();
  await registerViaUi(member, 'Учасник Тест', `e2e-member-${id}@studyflow.dev`);
  await member.getByTestId('nav-groups').click();
  await member.getByTestId('join-code-input').fill(code);
  await member.getByTestId('join-submit').click();
  const memberRow = member.getByTestId('deadline-row').filter({ hasText: title });
  await expect(memberRow).toHaveAttribute('data-status', 'pending');
  await memberRow.getByTestId('deadline-checkbox').click();
  await expect(memberRow).toHaveAttribute('data-status', 'done');

  // Headman: progress of the group.
  await headman.reload();
  await expect(
    headman.getByTestId('deadline-row').filter({ hasText: title }).getByTestId('progress-percent'),
  ).toHaveText('50%');
});

test('E2E-02 login with a wrong password shows an error', async ({ page, request }) => {
  const email = `e2e-login-${uniqueId()}@studyflow.dev`;
  await request.post('/api/auth/register', {
    data: { email, password: PASSWORD, fullName: 'Вхід Тест' },
  });

  await loginViaUi(page, email, 'wrong-password');

  await expect(page.getByTestId('auth-error')).toHaveText('Невірний email або пароль');
  await expect(page).toHaveURL(/\/login/);
});

test('E2E-03 the week calendar shows a deadline on the right day', async ({ page }) => {
  const id = uniqueId();
  const title = `Календарний дедлайн ${id}`;
  const today = localDay();
  await registerViaUi(page, 'Календар Тест', `e2e-calendar-${id}@studyflow.dev`);

  await page.getByTestId('create-deadline').click();
  await page.getByTestId('deadline-form-title').fill(title);
  await page.getByTestId('deadline-form-date').fill(today);
  await page.getByTestId('deadline-form-time').fill('23:58');
  await page.getByTestId('deadline-form-submit').click();
  await expect(page.getByTestId('deadline-row').filter({ hasText: title })).toBeVisible();

  await open(page, '/calendar');
  const chips = page.getByTestId('calendar-deadline').filter({ hasText: title });
  await expect(chips).toHaveCount(1);
  await expect(
    page.getByTestId(`calendar-day-${today}`).getByTestId('calendar-deadline'),
  ).toContainText(title);
});
