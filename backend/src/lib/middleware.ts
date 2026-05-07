import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth';

export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Access token required' });
  }

  const token = authHeader.slice(7);
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  request.user = decoded;
}
