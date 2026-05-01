export interface ReviewInput {
  diff?: string;
  files: string[];
  prompt: string;
  /** Forward Claude CLI output live (uses stream-json under the hood). */
  streamToConsole?: boolean;
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
