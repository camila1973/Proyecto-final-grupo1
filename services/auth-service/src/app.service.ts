import { Injectable } from "@nestjs/common";

export type HealthResponse = {
  status: "ok";
  service: "auth-service";
};

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return { status: "ok", service: "auth-service" };
  }
}
