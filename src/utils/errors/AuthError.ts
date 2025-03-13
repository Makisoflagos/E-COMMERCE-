class AuthError extends Error {
    statusCode: number;
  
    constructor(message: string, statusCode: number = 400) {
      super(message);
      this.name = 'AuthError';
      this.statusCode = statusCode;
  
      Object.setPrototypeOf(this, AuthError.prototype);
    }
  }
  
  export { AuthError };
  