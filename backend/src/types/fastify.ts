import { JWTPayload } from './auth';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

// This module augments the Fastify types to add the user property
export {};