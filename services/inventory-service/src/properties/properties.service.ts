import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PropertiesRepository } from "./properties.repository";
import {
  CreatePropertyDto,
  PublicProperty,
  UpdatePropertyDto,
} from "./properties.types";
import { PropertyRow } from "../database/database.types";

@Injectable()
export class PropertiesService {
  constructor(private readonly repo: PropertiesRepository) {}

  async create(
    partnerId: string,
    dto: CreatePropertyDto,
  ): Promise<PublicProperty> {
    const property = await this.repo.create({
      name: dto.name,
      type: dto.type,
      city: dto.city,
      stars: dto.stars,
      country_code: dto.countryCode,
      partner_id: partnerId,
    });
    return this.toPublic(property);
  }

  async findAll(
    partnerId: string,
    city?: string,
    status?: string,
  ): Promise<PublicProperty[]> {
    console.log(
      `Finding properties for partner ${partnerId} with filters city=${city} status=${status}`,
    );
    const rows = await this.repo.findAll(partnerId, { city, status });
    return rows.map((r) => this.toPublic(r));
  }

  async findOne(id: string, partnerId: string): Promise<PublicProperty> {
    const property = await this.repo.findById(id);
    if (!property) throw new NotFoundException(`Property ${id} not found`);
    if (property.partner_id !== partnerId) throw new ForbiddenException();
    return this.toPublic(property);
  }

  async update(
    id: string,
    partnerId: string,
    dto: UpdatePropertyDto,
  ): Promise<PublicProperty> {
    await this.findOne(id, partnerId);
    const updated = await this.repo.update(id, {
      name: dto.name,
      type: dto.type,
      city: dto.city,
      stars: dto.stars,
      status: dto.status,
      country_code: dto.countryCode,
    });
    if (!updated) throw new NotFoundException(`Property ${id} not found`);
    return this.toPublic(updated);
  }

  async remove(id: string, partnerId: string): Promise<void> {
    await this.findOne(id, partnerId);
    await this.repo.softDelete(id);
  }

  private toPublic(row: PropertyRow): PublicProperty {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      city: row.city,
      stars: row.stars,
      status: row.status,
      countryCode: row.country_code,
      partnerId: row.partner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
