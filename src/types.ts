export type Trade = {
  tradeId: string;
  version: number;
  counterPartyId: string;
  bookId: string;
  maturityDate: string;
  createdDate: string;
  expired: 'Y' | 'N';
};
