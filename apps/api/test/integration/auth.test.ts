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

	beforeEach(() => {
		;({ app, fakeDatabase } = buildTestApp({ passwordPepper }))
	})

	afterEach(async () => {
		await app.close()
	})

	it('signs up a user and returns a session cookie that can access /me', async () => {
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
			message: 'User created successfully',
			userID: expect.any(String),
		})

		const cookie = getSessionCookie(signupResponse.headers['set-cookie'])

		const meResponse = await app.inject({
			method: 'GET',
			url: '/me',
			headers: {
				cookie,
			},
		})

		expect(meResponse.statusCode).toBe(200)
		expect(meResponse.json()).toEqual({
			id: signupResponse.json().userID,
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

	it('logs in an existing user and persists the session for /me', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		const user: UserRow = {
			id: '11111111-1111-4111-8111-111111111111',
			role: 'user',
			name: 'Mateus',
			lastname: 'Silva',
			email: 'mateus@example.com',
			password_hash: passwordHash,
			email_verified_at: null,
			deleted_at: null,
			is_active: true,
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

	it('does not create a session for unverified signups in prod', async () => {
		const { app: prodApp } = buildTestApp({ passwordPepper, nodeEnv: 'prod' })

		try {
			const signupResponse = await prodApp.inject({
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
			expect(signupResponse.headers['set-cookie']).toBeUndefined()
		} finally {
			await prodApp.close()
		}
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
			password_hash: passwordHash,
			email_verified_at: null,
			deleted_at: null,
			is_active: true,
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
