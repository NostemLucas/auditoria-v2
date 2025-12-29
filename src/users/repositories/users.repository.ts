import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async create(user: UserEntity): Promise<UserEntity> {
    return await this.repository.save(user)
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.repository.find({
      relations: ['roles', 'organization'],
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['roles', 'organization'],
    })
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['roles', 'organization'],
    })
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { username: username.toLowerCase() },
      relations: ['roles', 'organization'],
    })
  }

  async findByCI(ci: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { ci },
      relations: ['roles', 'organization'],
    })
  }

  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return await this.repository.find({
      where: { organizationId },
      relations: ['roles', 'organization'],
      order: { createdAt: 'DESC' },
    })
  }

  async update(user: UserEntity): Promise<UserEntity> {
    return await this.repository.save(user)
  }

  async delete(user: UserEntity): Promise<void> {
    await this.repository.remove(user)
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', {
        email: email.toLowerCase(),
      })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async existsByUsername(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.username = :username', {
        username: username.toLowerCase(),
      })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async existsByCI(ci: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.ci = :ci', { ci })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }
}
