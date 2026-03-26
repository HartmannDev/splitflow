import { fastifyCookie } from '@fastify/cookie'
import { fastifyCors } from '@fastify/cors'
import { fastifySession } from '@fastify/session'
import { fastifySwagger } from '@fastify/swagger'
import { fastifySwaggerUi } from '@fastify/swagger-ui'
import { type FastifyInstance, fastify } from 'fastify'
import {
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { errorHandler } from './common/error-handler.ts'
import { accountsRoute } from './modules/accounts/route.ts'
import { PgSessionStore } from './modules/auth/pg-session-store.ts'
import { authRoute } from './modules/auth/route.ts'
import { categoriesRoute } from './modules/categories/route.ts'
import { contactsRoute } from './modules/contacts/route.ts'
import { currenciesRoute } from './modules/currencies/route.ts'
import { UsersRoute } from './modules/users/route.ts'

import type { AppDependency, BuildAppOptions } from './types/app.js'

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
		store: new PgSessionStore(options.database.pool),
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

	const appDeps: AppDependency = {
		db: options.database,
		emailTransporter: options.emailTransporter,
		config: {
			passwordPepper: options.passwordPepper,
			sessionSecret: options.sessionSecret,
			nodeEnv: options.nodeEnv,
		},
	}

	app.register(authRoute, appDeps)
	app.register(accountsRoute, appDeps)
	app.register(categoriesRoute, appDeps)
	app.register(contactsRoute, appDeps)
	app.register(currenciesRoute, appDeps)
	app.register(UsersRoute, appDeps)

	return app
}
