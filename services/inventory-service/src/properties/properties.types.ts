export interface CreatePropertyDto {
  name: string;
  type: string;
  city: string;
  stars?: number;
  countryCode: string;
}

export interface UpdatePropertyDto {
  name?: string;
  type?: string;
  city?: string;
  stars?: number;
  status?: string;
  countryCode?: string;
}

export interface PublicProperty {
  id: string;
  name: string;
  type: string;
  city: string;
  stars: number | null;
  status: string;
  countryCode: string;
  partnerId: string;
  createdAt: Date;
  updatedAt: Date;
}
