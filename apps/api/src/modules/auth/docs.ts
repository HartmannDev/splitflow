import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	ConflictErrorResponseSchema,
	InternalServerErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { UserSchemas } from '../users/model.ts'
import { EmailSchema, LoginSchema, ResetPasswordSchema, TokenSchema } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

const messageSchema = z.object({ message: z.string() })

export const buildAuthDocs = () => {
	const { UserSchema, CreateUserSchema, CreateUserResponseSchema } = UserSchemas()

	const loginDocs: FastifyOpenApiSchema = {
		description: 'Login to the application',
		tags: ['Auth'],
		body: LoginSchema,
		response: {
			200: messageSchema.describe('Successful login response'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: Invalid email or password'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const logoutDocs: FastifyOpenApiSchema = {
		description: 'Logout from the application',
		tags: ['Auth'],
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Successful logout response'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: No valid session found'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const meDocs: FastifyOpenApiSchema = {
		description: 'Get current logged in user',
		tags: ['Auth'],
		security: [{ cookieAuth: [] }],
		response: {
			200: UserSchema.describe('Current logged in user'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: No valid session found'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const signupDocs: FastifyOpenApiSchema = {
		description: 'Signup for a new account',
		tags: ['Auth'],
		body: CreateUserSchema,
		response: {
			201: CreateUserResponseSchema,
			409: ConflictErrorResponseSchema.describe('Conflict: Email already in use'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const verifyEmailDocs: FastifyOpenApiSchema = {
		description: 'Verify email address using token',
		tags: ['Auth'],
		querystring: z.object({
			token: TokenSchema.describe('Verification token sent to user email'),
		}),
		response: {
			200: messageSchema.describe('Email verified successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid or expired token'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const forgotPasswordDocs: FastifyOpenApiSchema = {
		description: 'Reset user password with email validation',
		tags: ['Auth'],
		body: EmailSchema,
		response: {
			200: messageSchema.describe('Confirmation email was sent to reset the password.'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid email.'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const resetUserPasswordDocs: FastifyOpenApiSchema = {
		description: 'Reset user password with email validation',
		tags: ['Auth'],
		body: ResetPasswordSchema.describe('Verification token and new password sent by user'),
		response: {
			200: messageSchema.describe('Password updated.'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid or expired token'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		loginDocs,
		logoutDocs,
		meDocs,
		signupDocs,
		verifyEmailDocs,
		resetUserPasswordDocs,
		forgotPasswordDocs,
	}
}
