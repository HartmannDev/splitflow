import process from 'node:process'
import { fastify } from 'fastify'
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
import { db } from './db/db.ts'
import { authRoute } from './modules/auth/route.ts'
import { PgSessionStore } from './modules/auth/pg-session-store.ts'

const app = fastify({ logger: { transport: { target: 'pino-pretty' } } }).withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifyCors, { origin: '*' })

app.register(fastifySwagger, {
	openapi: {
		info: {
			title: 'SplitFlow API Documentation',
			version: '1.0.0',
		},
	},
	transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
	routePrefix: '/docs',
})

app.register(fastifyCookie)
app.register(fastifySession, {
	store: new PgSessionStore(db.pool),
	cookieName: 'splitflow.sid',
	secret: process.env.SESSION_SECRET ?? 'xxxxx',
	saveUninitialized: false,
	cookie: {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'prod',
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

try {
	await db.testConnection()

	app.listen({ port: 3000, host: '0.0.0.0' }, (address) => {
		app.log.error(`server listening on ${address}`)
	})
} catch (error) {
	if (error) {
		db.closePool()
		app.log.error(error)
		process.exit(1)
	}
}
