import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

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
  }): Promise<{ challengeId: string }> {
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

    return res.json() as Promise<{ challengeId: string }>;
  }
}
