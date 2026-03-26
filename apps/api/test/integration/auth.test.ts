import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { UserRow } from '../helpers/fake-db.ts'

describe('auth integration', () => {
	const passwordPepper = 'test-pepper'
	const validPassword = 'Secret123!'
	let fakeDatabase: ReturnType<typeof buildTestApp>['fakeDatabase']
	let app: ReturnType<typeof buildTestApp>['app']
	let sentEmails: ReturnType<typeof buildTestApp>['sentEmails']

	beforeEach(() => {
		;({ app, fakeDatabase, sentEmails } = buildTestApp({ passwordPepper }))
	})

	afterEach(async () => {
		await app.close()
	})

	const getTokenFromEmail = (html: string) => {
		const match = html.match(/token=([a-f0-9]{64})/)
		expect(match?.[1]).toBeDefined()
		return match![1]
	}

	it('signs up a user', async () => {
		const signupResponse = await app.inject({
			method: 'POST',
			url: '/signup',
			payload: {
				name: 'Mateus',
				lastname: 'Silva',
				email: 'mateus@example.com',
				password: validPassword,
			},
		})

		expect(signupResponse.statusCode).toBe(201)
		expect(signupResponse.json()).toMatchObject({
			message: 'User created successfully. Verification email sent.',
			userID: expect.any(String),
		})
		expect(sentEmails).toHaveLength(1)
		expect(sentEmails[0]).toMatchObject({
			to: 'mateus@example.com',
			subject: 'Verify your email address',
		})
	})

	it('rejects duplicate signup with 409', async () => {
		await app.inject({
			method: 'POST',
			url: '/signup',
			payload: {
				name: 'Mateus',
				lastname: 'Silva',
				email: 'mateus@example.com',
				password: validPassword,
			},
		})

		const duplicateResponse = await app.inject({
			method: 'POST',
			url: '/signup',
			payload: {
				name: 'Another',
				lastname: 'User',
				email: 'mateus@example.com',
				password: validPassword,
			},
		})

		expect(duplicateResponse.statusCode).toBe(409)
		expect(duplicateResponse.json()).toEqual({
			statusCode: 409,
			error: 'ConflictError',
			message: 'Email already in use',
		})
	})

	it('verifies email using the emailed token', async () => {
		const signupResponse = await app.inject({
			method: 'POST',
			url: '/signup',
			payload: {
				name: 'Mateus',
				lastname: 'Silva',
				email: 'mateus@example.com',
				password: validPassword,
			},
		})

		expect(signupResponse.statusCode).toBe(201)

		const token = getTokenFromEmail(sentEmails[0].html)

		const verifyResponse = await app.inject({
			method: 'GET',
			url: `/verify-email?token=${token}`,
		})

		expect(verifyResponse.statusCode).toBe(200)
		expect(verifyResponse.json()).toEqual({
			message: 'Email verified successfully',
		})
	})

	it('sends a reset-password email for an existing user', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		fakeDatabase.seedUser({
			id: '33333333-3333-4333-8333-333333333333',
			role: 'user',
			name: 'Mateus',
			lastname: 'Silva',
			email: 'mateus@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
			deletedAt: null,
			isActive: true,
		})

		const response = await app.inject({
			method: 'POST',
			url: '/forgot-password',
			payload: {
				email: 'Mateus@Example.com',
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({
			message: 'Confirmation email was sent to reset the password.',
		})
		expect(sentEmails).toHaveLength(1)
		expect(sentEmails[0]).toMatchObject({
			to: 'mateus@example.com',
			subject: 'Reset your password',
		})
	})

	it('returns the same forgot-password response for unknown emails', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/forgot-password',
			payload: {
				email: 'missing@example.com',
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({
			message: 'Confirmation email was sent to reset the password.',
		})
		expect(sentEmails).toHaveLength(0)
	})

	it('resets password using the emailed token', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		fakeDatabase.seedUser({
			id: '44444444-4444-4444-8444-444444444444',
			role: 'user',
			name: 'Mateus',
			lastname: 'Silva',
			email: 'mateus@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
			deletedAt: null,
			isActive: true,
		})

		const forgotResponse = await app.inject({
			method: 'POST',
			url: '/forgot-password',
			payload: {
				email: 'mateus@example.com',
			},
		})

		expect(forgotResponse.statusCode).toBe(200)
		const token = getTokenFromEmail(sentEmails[0].html)

		const resetResponse = await app.inject({
			method: 'POST',
			url: '/reset-password',
			payload: {
				token,
				password: 'NewSecret123!',
			},
		})

		expect(resetResponse.statusCode).toBe(200)
		expect(resetResponse.json()).toEqual({
			message: 'Password updated.',
		})

		const loginResponse = await app.inject({
			method: 'POST',
			url: '/login',
			payload: {
				email: 'mateus@example.com',
				password: 'NewSecret123!',
			},
		})

		expect(loginResponse.statusCode).toBe(200)
	})

	it('rejects reset-password with an invalid token', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/reset-password',
			payload: {
				token: 'a'.repeat(64),
				password: 'NewSecret123!',
			},
		})

		expect(response.statusCode).toBe(400)
		expect(response.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Invalid or expired token',
		})
	})

	it('logs in an existing user and persists the session for /me', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		const user: UserRow = {
			id: '11111111-1111-4111-8111-111111111111',
			role: 'user',
			name: 'Mateus',
			lastname: 'Silva',
			email: 'mateus@example.com',
			passwordHash,
			emailVerifiedAt: null,
			deletedAt: null,
			isActive: true,
		}

		fakeDatabase.seedUser(user)

		const loginResponse = await app.inject({
			method: 'POST',
			url: '/login',
			payload: {
				email: 'mateus@example.com',
				password: validPassword,
			},
		})

		expect(loginResponse.statusCode).toBe(200)
		expect(loginResponse.json()).toEqual({
			message: 'Login successful',
		})

		const cookie = getSessionCookie(loginResponse.headers['set-cookie'])

		const meResponse = await app.inject({
			method: 'GET',
			url: '/me',
			headers: {
				cookie,
			},
		})

		expect(meResponse.statusCode).toBe(200)
		expect(meResponse.json()).toEqual({
			id: '11111111-1111-4111-8111-111111111111',
			role: 'user',
			name: 'Mateus',
			lastname: 'Silva',
			email: 'mateus@example.com',
			isActive: true,
			emailVerifiedAt: null,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			deletedAt: null,
		})
	})

	it('rejects invalid credentials', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/login',
			payload: {
				email: 'missing@example.com',
				password: validPassword,
			},
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({
			statusCode: 401,
			error: 'Unauthorized',
			message: 'Invalid email or password',
		})
	})

	it('requires authentication for /me', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/me',
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({
			statusCode: 401,
			error: 'Unauthorized',
			message: 'You must be logged in to access this route',
		})
	})

	it('rejects login for unverified users in prod', async () => {
		const { app: prodApp, fakeDatabase: prodDatabase } = buildTestApp({ passwordPepper, nodeEnv: 'prod' })
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		prodDatabase.seedUser({
			id: '22222222-2222-4222-8222-222222222222',
			role: 'user',
			name: 'Mateus',
			lastname: 'Silva',
			email: 'mateus@example.com',
			passwordHash,
			emailVerifiedAt: null,
			deletedAt: null,
			isActive: true,
		})

		try {
			const response = await prodApp.inject({
				method: 'POST',
				url: '/login',
				payload: {
					email: 'mateus@example.com',
					password: validPassword,
				},
			})

			expect(response.statusCode).toBe(401)
			expect(response.json()).toEqual({
				statusCode: 401,
				error: 'Unauthorized',
				message: 'Email verification required before login',
			})
		} finally {
			await prodApp.close()
		}
	})
})
