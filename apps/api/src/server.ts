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

import { transactionsRoute } from './modules/transactions/route.ts'
import { errorHandler } from './common/error-handler.ts'

const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

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

app.register(transactionsRoute)

app.setErrorHandler(errorHandler)

app.setNotFoundHandler((request, reply) => {
	reply.status(404).send({
		statusCode: 404,
		error: 'Not Found',
		message: `Route ${request.method} ${request.url} not found`,
	})
})

app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		app.log.error(err)
		process.exit(1)
	}

	app.log.error(`server listening on ${address}`)
})
