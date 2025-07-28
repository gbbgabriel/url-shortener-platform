import { Test, TestingModule } from '@nestjs/testing';
import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();

    service = module.get<HashService>(HashService);
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';

      const result = await service.hashPassword(password);

      expect(result).toBeDefined();
      expect(result).not.toBe(password);
      expect(result.length).toBeGreaterThan(50);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.comparePassword(wrongPassword, hash);

      expect(result).toBe(false);
    });
  });
});
