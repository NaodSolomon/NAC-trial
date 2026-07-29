import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { NavigationRepository } from '../interfaces/navigation-repository.interface';
import { NavigationService } from './navigation.service';

const actor: AdminPrincipal = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Content Editor',
  email: 'editor@example.com',
  role: 'CONTENT_EDITOR',
};

describe('NavigationService', () => {
  let navigation: jest.Mocked<NavigationRepository>;
  let service: NavigationService;

  beforeEach(() => {
    navigation = {
      publicList: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new NavigationService(navigation);
  });

  it('rejects empty updates before accessing the repository', async () => {
    await expect(service.update('item-id', {}, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(navigation.update).not.toHaveBeenCalled();
  });

  it('reports a missing navigation item', async () => {
    navigation.update.mockResolvedValue(null);

    await expect(service.update('missing-id', { label: 'About' }, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
