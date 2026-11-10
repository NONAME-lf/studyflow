import { generateInviteCode } from './invite-code.js';

describe('InviteCode', () => {
  it('UT-09 invite code has 8 characters from the allowed alphabet', () => {
    const codes = Array.from({ length: 500 }, () => generateInviteCode());

    for (const code of codes) {
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
    expect(new Set(codes).size).toBeGreaterThan(490);
  });
});
