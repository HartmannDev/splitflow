import z from 'zod'

export const ErrorResponseSchema = z.object({
	statusCode: z.number(),
	error: z.string(),
	message: z.string(),
})

export const BadRequestErrorResponseSchema = ErrorResponseSchema.extend({
	statusCode: z.literal(400),
	error: z.literal('Bad Request'),
})

export const NotFoundErrorResponseSchema = ErrorResponseSchema.extend({
	statusCode: z.literal(404),
	error: z.literal('Not Found'),
	message: z.string(),
})

export const InternalServerErrorResponseSchema = ErrorResponseSchema.extend({
	statusCode: z.literal(500),
})

export const ConflictErrorResponseSchema = ErrorResponseSchema.extend({
	statusCode: z.literal(409),
	error: z.literal('ConflictError'),
	message: z.string(),
})

export const ForbiddenErrorResponseSchema = ErrorResponseSchema.extend({
	statusCode: z.literal(403),
	error: z.literal('Forbidden'),
	message: z.string(),
})

export const UnauthorizedErrorResponseSchema = ErrorResponseSchema.extend({
	statusCode: z.number().default(401),
	error: z.string().default('Unauthorized'),
	message: z.string(),
})
