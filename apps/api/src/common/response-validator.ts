import type { FastifyReply } from 'fastify'
import type z from 'zod'

export const validatedResponse = (reply: FastifyReply, statusCode: number, schema: z.ZodType<T>, payload: T) => {
	if (process.env.NODE_ENV === 'dev') {
		schema.parse(payload)
	}
	return reply.code(statusCode).send(payload)
}
