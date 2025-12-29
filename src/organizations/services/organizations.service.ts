import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OrganizationEntity } from '../entities/organization.entity'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationEntity> {
    // Verificar si ya existe una organización con el mismo nombre o NIT
    const existingByName = await this.organizationRepository.findOne({
      where: { name: createOrganizationDto.name },
    })

    if (existingByName) {
      throw new ConflictException(
        `Ya existe una organización con el nombre "${createOrganizationDto.name}"`,
      )
    }

    const existingByNit = await this.organizationRepository.findOne({
      where: { nit: createOrganizationDto.nit },
    })

    if (existingByNit) {
      throw new ConflictException(
        `Ya existe una organización con el NIT "${createOrganizationDto.nit}"`,
      )
    }

    const organization = this.organizationRepository.create(
      createOrganizationDto,
    )

    return await this.organizationRepository.save(organization)
  }

  async findAll(): Promise<OrganizationEntity[]> {
    return await this.organizationRepository.find({
      where: { isActive: true },
      relations: ['users'],
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findOne({
      where: { id, isActive: true },
      relations: ['users'],
    })

    if (!organization) {
      throw new NotFoundException(`Organización con ID ${id} no encontrada`)
    }

    return organization
  }

  async findByNit(nit: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findOne({
      where: { nit, isActive: true },
      relations: ['users'],
    })

    if (!organization) {
      throw new NotFoundException(`Organización con NIT ${nit} no encontrada`)
    }

    return organization
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    const organization = await this.findOne(id)

    // Si se está actualizando el nombre, verificar unicidad
    if (
      updateOrganizationDto.name &&
      updateOrganizationDto.name !== organization.name
    ) {
      const existingByName = await this.organizationRepository.findOne({
        where: { name: updateOrganizationDto.name },
      })

      if (existingByName) {
        throw new ConflictException(
          `Ya existe una organización con el nombre "${updateOrganizationDto.name}"`,
        )
      }
    }

    // Si se está actualizando el NIT, verificar unicidad
    if (
      updateOrganizationDto.nit &&
      updateOrganizationDto.nit !== organization.nit
    ) {
      const existingByNit = await this.organizationRepository.findOne({
        where: { nit: updateOrganizationDto.nit },
      })

      if (existingByNit) {
        throw new ConflictException(
          `Ya existe una organización con el NIT "${updateOrganizationDto.nit}"`,
        )
      }
    }

    Object.assign(organization, updateOrganizationDto)

    return await this.organizationRepository.save(organization)
  }

  async uploadLogo(id: string, logoUrl: string): Promise<OrganizationEntity> {
    const organization = await this.findOne(id)

    organization.logoUrl = logoUrl

    return await this.organizationRepository.save(organization)
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id)

    // Verificar si tiene usuarios activos
    const activeUsersCount = await this.organizationRepository
      .createQueryBuilder('org')
      .leftJoin('org.users', 'user')
      .where('org.id = :id', { id })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount()

    if (activeUsersCount > 0) {
      throw new BadRequestException(
        'No se puede desactivar una organización con usuarios activos. Desactive primero los usuarios.',
      )
    }

    organization.isActive = false
    await this.organizationRepository.save(organization)
  }

  async delete(id: string): Promise<void> {
    await this.organizationRepository.delete(id)
  }
}
