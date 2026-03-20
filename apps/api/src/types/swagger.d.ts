import type { FastifySchema } from 'fastify'

export type FastifyOpenApiSchema = FastifySchema & {
	description?: string
	tags?: string[]
}
