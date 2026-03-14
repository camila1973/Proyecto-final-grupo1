import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth(): object {
    return { status: "ok", service: "payment-service" };
  }

  getTransactions(): object {
    return {
      total: 2,
      transactions: [
        {
          id: "txn_001",
          reservationId: "res_001",
          amount: 1750,
          currency: "USD",
          provider: "stripe",
          status: "captured",
          createdAt: "2026-03-10T14:22:00Z",
        },
        {
          id: "txn_002",
          reservationId: "res_002",
          amount: 240,
          currency: "BRL",
          provider: "mercadopago",
          status: "pending",
          createdAt: "2026-03-11T09:05:00Z",
        },
      ],
    };
  }

  charge(body: {
    reservationId: string;
    amount: number;
    currency: string;
    provider: string;
  }): object {
    return {
      id: "txn_" + Math.random().toString(36).slice(2, 9),
      ...body,
      status: "captured",
      last4: "4242",
      processedAt: new Date().toISOString(),
    };
  }
}
