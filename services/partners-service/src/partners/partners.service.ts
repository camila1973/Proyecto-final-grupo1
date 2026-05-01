import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { PartnersRepository } from "./partners.repository.js";
import { AuthClientService } from "../clients/auth-client.service.js";
import { MembersRepository } from "../members/members.repository.js";
import {
  CreatePartnerDto,
  RegisterPartnerDto,
  UpdatePartnerDto,
} from "./dto/partner.dto.js";

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly repo: PartnersRepository,
    private readonly authClient: AuthClientService,
    private readonly membersRepo: MembersRepository,
  ) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    return this.repo.findById(id);
  }

  async create(dto: CreatePartnerDto) {
    const existing = await this.repo.findBySlug(dto.slug);
    if (existing)
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    return this.repo.insert({ name: dto.name, slug: dto.slug });
  }

  async update(id: string, dto: UpdatePartnerDto) {
    return this.repo.update(id, dto);
  }

  async register(dto: RegisterPartnerDto) {
    const existing = await this.repo.findBySlug(dto.slug);
    if (existing)
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const partner = await this.repo.insert({
      name: dto.orgName,
      slug: dto.slug,
    });

    let challengeId: string;
    try {
      const { challengeId: cid, userId } =
        await this.authClient.createOwnerUser({
          email: dto.ownerEmail,
          password: dto.ownerPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          partnerId: partner.id,
        });
      challengeId = cid;

      await this.membersRepo.insert({
        partnerId: partner.id,
        userId,
        role: "partner",
        propertyId: null,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create owner user for partner ${partner.id}, compensating: ${err}`,
      );
      await this.repo.delete(partner.id).catch((deleteErr) => {
        this.logger.warn(
          `Failed to compensate (delete partner ${partner.id}): ${deleteErr}`,
        );
      });
      throw err;
    }

    return { partner, challengeId };
  }
}
