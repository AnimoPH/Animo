export type Rating = {
  id: string;
  transactionId: string;
  raterId: string;
  ratedId: string;
  score: number;
  comment: string | null;
};

export type SubmitRatingInput = {
  transactionId: string;
  ratedId: string;
  score: number;
  comment?: string;
};
