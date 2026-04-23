export class GuestInfoDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export class CreateReservationDto {
  propertyId: string;
  roomId: string;
  partnerId: string;
  bookerId: string;
  guestInfo: GuestInfoDto;
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
