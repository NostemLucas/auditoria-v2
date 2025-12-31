import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MaturityLevelEntity } from '../entities/maturity-level.entity'
import { CreateMaturityLevelDto, UpdateMaturityLevelDto } from '../dtos'

@Injectable()
export class MaturityLevelsService {
  constructor(
    @InjectRepository(MaturityLevelEntity)
    private readonly maturityLevelRepository: Repository<MaturityLevelEntity>,
  ) {}

  async create(
    createMaturityLevelDto: CreateMaturityLevelDto,
  ): Promise<MaturityLevelEntity> {
    const level = this.maturityLevelRepository.create(createMaturityLevelDto)
    return await this.maturityLevelRepository.save(level)
  }

  async findAll(): Promise<MaturityLevelEntity[]> {
    return await this.maturityLevelRepository.find({
      relations: ['framework'],
      order: { order: 'ASC' },
    })
  }

  async findByFramework(frameworkId: string): Promise<MaturityLevelEntity[]> {
    return await this.maturityLevelRepository.find({
      where: { frameworkId },
      order: { order: 'ASC' },
    })
  }

  async findOne(id: string): Promise<MaturityLevelEntity> {
    const level = await this.maturityLevelRepository.findOne({
      where: { id },
      relations: ['framework'],
    })

    if (!level) {
      throw new NotFoundException(`Nivel de madurez con ID ${id} no encontrado`)
    }

    return level
  }

  async findByValue(
    frameworkId: string,
    numericValue: number,
  ): Promise<MaturityLevelEntity | null> {
    return await this.maturityLevelRepository.findOne({
      where: {
        frameworkId,
        numericValue,
      },
    })
  }

  async findByRange(
    frameworkId: string,
    value: number,
  ): Promise<MaturityLevelEntity | null> {
    // Para frameworks de tipo porcentaje, encuentra el nivel por rango
    const levels = await this.findByFramework(frameworkId)

    return (
      levels.find((level) => {
        if (level.minRange !== null && level.maxRange !== null) {
          return value >= level.minRange && value <= level.maxRange
        }
        return false
      }) || null
    )
  }

  async update(
    id: string,
    updateMaturityLevelDto: UpdateMaturityLevelDto,
  ): Promise<MaturityLevelEntity> {
    const level = await this.findOne(id)
    Object.assign(level, updateMaturityLevelDto)
    return await this.maturityLevelRepository.save(level)
  }

  async remove(id: string): Promise<void> {
    const level = await this.findOne(id)
    await this.maturityLevelRepository.remove(level)
  }

  async deactivate(id: string): Promise<MaturityLevelEntity> {
    const level = await this.findOne(id)
    level.isActive = false
    return await this.maturityLevelRepository.save(level)
  }

  async activate(id: string): Promise<MaturityLevelEntity> {
    const level = await this.findOne(id)
    level.isActive = true
    return await this.maturityLevelRepository.save(level)
  }
}
