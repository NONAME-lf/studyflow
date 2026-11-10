import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const queryRaw = vi.fn();
  const service = new HealthService({ $queryRaw: queryRaw } as unknown as PrismaService);

  beforeEach(() => {
    queryRaw.mockReset();
  });

  it('UT-35 database responds → status ok, database up', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.check()).resolves.toMatchObject({ status: 'ok', database: 'up' });
  });

  it('UT-36 database unavailable → ServiceUnavailableException (503)', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
