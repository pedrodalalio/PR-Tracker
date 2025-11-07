import { JWTPayload } from './auth';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}