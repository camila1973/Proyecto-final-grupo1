export class InitiatePaymentDto {
  reservationId: string;
  amountUsd: number;
  currency: string;
  guestEmail: string;
}
