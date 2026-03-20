import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
	request.log.error(error)

	if (error.validation) {
		return reply.status(400).send({
			statusCode: 400,
			error: 'Bad Request',
			message: error.message,
		})
	}

	if (error instanceof ZodError) {
		const validationIssueMessage = error.issues.reduce((acc, issue) => {
			acc += `Field '${issue.path.join('.')}' => ${issue.message} | `
			console.log(acc)
			return acc
		}, '')

		return reply.status(500).send({
			statusCode: 500,
			error: 'Internal Server Error - Response Validation Failed',
			message: validationIssueMessage,
		})
	}

	const statusCode =
		typeof (error as { statusCode?: unknown }).statusCode === 'number'
			? (error as { statusCode: number }).statusCode
			: 500

	if (statusCode >= 500) {
		return reply.status(500).send({
			statusCode: 500,
			error: 'Internal Server Error',
			message: 'Unexpected error',
		})
	}

	return reply.status(statusCode).send({
		statusCode,
		error: error.name || 'Error',
		message: error.message,
	})
}
