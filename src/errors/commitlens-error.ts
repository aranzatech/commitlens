export class CommitlensError extends Error {
  public readonly code: string;

  public constructor(message: string, code = "COMMITLENS_ERROR") {
    super(message);
    this.name = "CommitlensError";
    this.code = code;
  }
}
