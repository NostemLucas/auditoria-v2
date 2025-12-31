import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FrameworkEntity } from '../entities/framework.entity'
import { CreateFrameworkDto, UpdateFrameworkDto } from '../dtos'

@Injectable()
export class FrameworksService {
  constructor(
    @InjectRepository(FrameworkEntity)
    private readonly frameworkRepository: Repository<FrameworkEntity>,
  ) {}

  async create(
    createFrameworkDto: CreateFrameworkDto,
  ): Promise<FrameworkEntity> {
    const framework = this.frameworkRepository.create(createFrameworkDto)
    return await this.frameworkRepository.save(framework)
  }

  async findAll(): Promise<FrameworkEntity[]> {
    return await this.frameworkRepository.find({
      order: { createdAt: 'DESC' },
    })
  }

  async findAllActive(): Promise<FrameworkEntity[]> {
    return await this.frameworkRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    })
  }

  async findByType(frameworkType: string): Promise<FrameworkEntity[]> {
    return await this.frameworkRepository.find({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { frameworkType: frameworkType as any },
      order: { name: 'ASC' },
    })
  }

  async findByScoringType(scoringType: string): Promise<FrameworkEntity[]> {
    return await this.frameworkRepository.find({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { scoringType: scoringType as any },
      order: { name: 'ASC' },
    })
  }

  async findOne(id: string): Promise<FrameworkEntity> {
    const framework = await this.frameworkRepository.findOne({
      where: { id },
      relations: ['levels'],
    })

    if (!framework) {
      throw new NotFoundException(`Framework con ID ${id} no encontrado`)
    }

    return framework
  }

  async findByName(name: string): Promise<FrameworkEntity | null> {
    return await this.frameworkRepository.findOne({
      where: { name },
    })
  }

  async update(
    id: string,
    updateFrameworkDto: UpdateFrameworkDto,
  ): Promise<FrameworkEntity> {
    const framework = await this.findOne(id)
    Object.assign(framework, updateFrameworkDto)
    return await this.frameworkRepository.save(framework)
  }

  async remove(id: string): Promise<void> {
    const framework = await this.findOne(id)
    await this.frameworkRepository.remove(framework)
  }

  async deactivate(id: string): Promise<FrameworkEntity> {
    const framework = await this.findOne(id)
    framework.isActive = false
    return await this.frameworkRepository.save(framework)
  }

  async activate(id: string): Promise<FrameworkEntity> {
    const framework = await this.findOne(id)
    framework.isActive = true
    return await this.frameworkRepository.save(framework)
  }
}
