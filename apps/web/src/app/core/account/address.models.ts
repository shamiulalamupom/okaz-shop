export interface Address {
  id: string;
  label?: string | null;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt?: string;
}

export interface AddressPayload {
  label?: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export const formatAddress = (address: Address): string => {
  const prefix = address.label ? `${address.label} — ` : '';
  return `${prefix}${address.line1}, ${address.postalCode} ${address.city}, ${address.country}`;
};
