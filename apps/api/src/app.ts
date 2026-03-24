import { fastify, type FastifyInstance } from 'fastify'
import {
	serializerCompiler,
	validatorCompiler,
	jsonSchemaTransform,
	type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import { fastifySwaggerUi } from '@fastify/swagger-ui'
import { fastifySession } from '@fastify/session'
import { fastifyCookie } from '@fastify/cookie'

import { UsersRoute } from './modules/users/route.ts'
import { errorHandler } from './common/error-handler.ts'
import { authRoute } from './modules/auth/route.ts'
import { PgSessionStore } from './modules/auth/pg-session-store.ts'
import type { Pool } from 'pg'

type BuildAppOptions = {
	sessionSecret: string
	nodeEnv: 'dev' | 'prod' | 'test'
	pool: Pool
	logger?: boolean | object
}

export const buildApp = (options: BuildAppOptions): FastifyInstance => {
	const app = fastify({
		logger: options.logger ?? { transport: { target: 'pino-pretty' } },
	}).withTypeProvider<ZodTypeProvider>()

	app.setSerializerCompiler(serializerCompiler)
	app.setValidatorCompiler(validatorCompiler)

	app.register(fastifyCors, { origin: '*' })

	app.register(fastifySwagger, {
		openapi: {
			info: {
				title: 'SplitFlow API Documentation',
				version: '1.0.0',
			},
			components: {
				securitySchemes: {
					cookieAuth: {
						type: 'apiKey',
						in: 'cookie',
						name: 'splitflow.sid',
					},
				},
			},
		},
		transform: jsonSchemaTransform,
	})

	app.register(fastifySwaggerUi, {
		routePrefix: '/docs',
	})

	app.register(fastifyCookie)
	app.register(fastifySession, {
		store: new PgSessionStore(options.pool),
		cookieName: 'splitflow.sid',
		secret: options.sessionSecret,
		saveUninitialized: false,
		cookie: {
			path: '/',
			httpOnly: true,
			secure: options.nodeEnv === 'prod',
			sameSite: 'lax',
			maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
		},
	})

	app.setErrorHandler(errorHandler)

	app.setNotFoundHandler((request, reply) => {
		reply.status(404).send({
			statusCode: 404,
			error: 'Not Found',
			message: `Route ${request.method} ${request.url} not found`,
		})
	})

	app.register(authRoute)
	app.register(UsersRoute)

	return app
}
