export class ProviderError extends Error {
  public readonly code: string;

  public constructor(message: string, code = "PROVIDER_ERROR") {
    super(message);
    this.name = "ProviderError";
    this.code = code;
  }
}
