import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth';
import { JWTPayload } from '../types/auth';


export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return reply.status(401).send({
        error: 'Access token required'
      });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return reply.status(403).send({
        error: 'Invalid or expired token'
      });
    }

    request.user = decoded;
  } catch (error) {
    return reply.status(403).send({
      error: 'Invalid token'
    });
  }
}