export class CreateReservationDto {
  propertyId: string;
  roomId: string;
  partnerId: string;
  guestId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export class PreviewReservationDto {
  propertyId: string;
  roomId: string;
  partnerId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}
