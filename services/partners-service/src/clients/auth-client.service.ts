import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  partnerId?: string;
  propertyId?: string;
  createdAt: string;
  lastLoginAt: string | null;
}

@Injectable()
export class AuthClientService {
  private readonly baseUrl =
    process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

  async createOwnerUser(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    partnerId: string;
  }): Promise<{ challengeId: string; userId: string }> {
    const res = await fetch(`${this.baseUrl}/internal/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, role: "partner" }),
    });

    if (res.status === 409) {
      throw new ConflictException("Email is already registered");
    }

    if (!res.ok) {
      const body = await res.text();
      throw new InternalServerErrorException(
        `auth-service user creation failed [${res.status}]: ${body}`,
      );
    }

    return res.json() as Promise<{ challengeId: string; userId: string }>;
  }

  async createManagerUser(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    partnerId: string;
    propertyId: string;
  }): Promise<{ challengeId: string; userId: string }> {
    const res = await fetch(`${this.baseUrl}/internal/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, role: "manager" }),
    });

    if (res.status === 409) {
      throw new ConflictException("Email is already registered");
    }

    if (!res.ok) {
      const body = await res.text();
      throw new InternalServerErrorException(
        `auth-service manager creation failed [${res.status}]: ${body}`,
      );
    }

    return res.json() as Promise<{ challengeId: string; userId: string }>;
  }

  async listUsersByIds(ids: string[]): Promise<AuthUser[]> {
    if (!ids.length) return [];
    const qs = ids.map(encodeURIComponent).join(",");
    const res = await fetch(`${this.baseUrl}/internal/users?ids=${qs}`);
    if (!res.ok) {
      throw new InternalServerErrorException(
        `auth-service user fetch failed [${res.status}]`,
      );
    }
    return res.json() as Promise<AuthUser[]>;
  }
}
