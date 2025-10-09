import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { workoutRoutes } from './routes/workouts';
import { exerciseRoutes } from './routes/exercises';
import { goalsRoutes } from './routes/goals';

const fastify = Fastify({
  logger: true
});

fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});

fastify.register(cors, {
  origin: (origin, callback) => {
    // Allow requests without origin (React Native, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    const hostname = new URL(origin).hostname;
    if(hostname === 'localhost' || hostname === '127.0.0.1') {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed"), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

fastify.get('/', async (request, reply) => {
  return { message: 'Gym Stats Tracker API is running!' };
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(workoutRoutes, { prefix: '/api' });
fastify.register(exerciseRoutes, { prefix: '/api' });
fastify.register(goalsRoutes, { prefix: '/api' });

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();