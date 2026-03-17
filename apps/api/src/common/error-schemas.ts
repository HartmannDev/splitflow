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
})

export const InternalServerErrorResponseSchema = ErrorResponseSchema.extend({
	statusCode: z.literal(500),
	error: z.literal('Internal Server Error'),
})

export const CommonRouteErrorResponses = {
	400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
	500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
} as const

export function withCommonErrorResponses<T extends Record<string | number, unknown>>(responses: T) {
	return {
		...responses,
		...CommonRouteErrorResponses,
	}
}
