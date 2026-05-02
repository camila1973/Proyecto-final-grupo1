import { ConflictException, Injectable } from "@nestjs/common";
import { MembersRepository } from "./members.repository.js";
import { AuthClientService } from "../clients/auth-client.service.js";
import { InviteMemberDto } from "./dto/invite-member.dto.js";
import { PartnerMemberRow } from "../database/database.types.js";

export interface PartnerMemberDto {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  propertyId: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly repo: MembersRepository,
    private readonly authClient: AuthClientService,
  ) {}

  async findByPartner(partnerId: string): Promise<PartnerMemberRow[]> {
    return this.repo.findByPartnerId(partnerId);
  }

  async findByProperty(propertyId: string): Promise<PartnerMemberRow[]> {
    return this.repo.findByPropertyId(propertyId);
  }

  async findByPartnerEnriched(partnerId: string): Promise<PartnerMemberDto[]> {
    const rows = await this.repo.findByPartnerId(partnerId);
    if (!rows.length) return [];

    const userIds = rows.map((r) => r.userId);
    const authUsers = await this.authClient.listUsersByIds(userIds);

    const userMap = new Map(authUsers.map((u) => [u.id, u]));

    return rows.map((row) => {
      const user = userMap.get(row.userId);
      return {
        id: row.id,
        userId: row.userId,
        email: user?.email ?? "",
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        role: row.role,
        propertyId: row.propertyId,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        lastLoginAt: user?.lastLoginAt ?? null,
      };
    });
  }

  async invite(
    dto: InviteMemberDto,
  ): Promise<{ manager: PartnerMemberRow; challengeId: string }> {
    const existing = await this.repo.findByPropertyId(dto.propertyId);
    if (existing.length > 0) {
      throw new ConflictException(
        `Property ${dto.propertyId} already has a manager assigned`,
      );
    }

    const { challengeId, userId } = await this.authClient.createManagerUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      partnerId: dto.partnerId,
      propertyId: dto.propertyId,
    });

    const manager = await this.repo.insert({
      partnerId: dto.partnerId,
      propertyId: dto.propertyId,
      userId,
      role: "manager",
    });

    return { manager, challengeId };
  }

  async remove(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
