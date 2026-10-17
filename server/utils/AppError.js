export default class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);

    this.status = status;
    this.code = code;

    if (fields) {
      this.fields = fields;
    }

    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
