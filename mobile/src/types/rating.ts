export type Rating = {
  id: string;
  transactionId: string;
  raterId: string;
  ratedId: string;
  score: number;
  comment: string | null;
  flaggedWordHit: boolean;
};

export type SubmitRatingInput = {
  transactionId: string;
  ratedId: string;
  score: number;
  comment?: string;
};
