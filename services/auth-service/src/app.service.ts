import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return { status: 'ok', service: 'auth-service' };
  }

  register(body: { email: string; password: string }): object {
    return {
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      email: body.email,
      createdAt: new Date().toISOString(),
    };
  }

  login(body: { email: string; password: string }): object {
    return {
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.dummy.signature',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { id: 'usr_001', email: body.email, role: 'guest' },
    };
  }

  getUsers(): object[] {
    return [
      { id: 'usr_001', email: 'alice@travelhub.com', role: 'admin' },
      { id: 'usr_002', email: 'bob@travelhub.com', role: 'guest' },
      { id: 'usr_003', email: 'carol@travelhub.com', role: 'partner' },
    ];
  }
}
