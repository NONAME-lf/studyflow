import type { AuthUser } from '../auth/auth.types.js';
import type { GroupMember } from '../generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by JwtAuthGuard. */
      user?: AuthUser;
      /** Set by GroupRoleGuard for /groups/:groupId/* routes. */
      groupMembership?: GroupMember;
    }
  }
}

export {};
