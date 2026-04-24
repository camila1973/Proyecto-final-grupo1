export interface PropertyRoomsDto {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  /** ISO-639-1 language tag used to localize property description */
  language?: string;
}

export interface PropertyReviewsQueryDto {
  page: number;
  pageSize: number;
  language?: string;
}
