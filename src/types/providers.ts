export interface ReviewInput {
  diff?: string;
  files: string[];
  prompt: string;
}

export interface ReviewResult {
  issues?: string[];
  message: string;
  passed: boolean;
}

export interface AIProvider {
  isAvailable(): Promise<boolean>;
  name: string;
  review(input: ReviewInput): Promise<ReviewResult>;
}
