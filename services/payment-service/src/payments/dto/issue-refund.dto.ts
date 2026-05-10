// Body of POST /payments/:reservationId/refund.
// Actor metadata is supplied by the upstream caller (booking-service forwards
// the gateway-trusted x-user-id / x-user-role) so it can be persisted on the
// audit row alongside the IP captured by the controller.
export class IssueRefundDto {
  reason: string;
  actorId?: string | null;
  actorRole?: string | null;
}
