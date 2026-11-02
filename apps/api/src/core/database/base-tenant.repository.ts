import { Repository, FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';
import { TenantContext } from '../tenant-context';
import { BaseTenantEntity } from './base-tenant.entity';

export abstract class BaseTenantRepository<T extends BaseTenantEntity> extends Repository<T> {
  protected get tenantId(): string {
    return TenantContext.getTenantId();
  }

  async findAllByTenant(options?: FindManyOptions<T>): Promise<T[]> {
    return this.find({
      ...options,
      where: {
        ...(options?.where as object),
        tenantId: this.tenantId,
      } as any,
    });
  }

  async findOneByTenant(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    return this.findOne({
      ...options,
      where: {
        ...(options?.where as object),
        id,
        tenantId: this.tenantId,
      } as any,
    });
  }

  async findOneByTenantOrFail(id: string): Promise<T> {
    const entity = await this.findOneByTenant(id);
    if (!entity) {
      throw new Error(`Entity with id ${id} not found in tenant ${this.tenantId}`);
    }
    return entity;
  }

  async saveForTenant(entityData: DeepPartial<T>): Promise<T> {
    const entity = this.create({
      ...entityData,
      tenantId: this.tenantId,
    } as DeepPartial<T>);
    return this.save(entity);
  }

  async softDeleteByTenant(id: string): Promise<void> {
    await this.findOneByTenantOrFail(id);
    await this.softDelete(id);
  }

  countByTenant(where?: Partial<T>): Promise<number> {
    return this.count({
      where: { ...where, tenantId: this.tenantId } as any,
    });
  }
}
