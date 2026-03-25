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
			sessionUser: {
				userId: signupResponse.json().userID,
				email: 'mateus@example.com',
				role: 'user',
			},
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
			id: 'user-1',
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
			sessionUser: {
				userId: 'user-1',
				email: 'mateus@example.com',
				role: 'user',
			},
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
})
