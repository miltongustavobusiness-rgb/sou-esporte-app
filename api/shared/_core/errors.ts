export class ForbiddenError extends Error {
  constructor(message: string = "Acesso proibido") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Não autorizado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
