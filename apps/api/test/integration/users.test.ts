import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'
import type { UserRow } from '../helpers/fake-db.ts'

describe('users integration', () => {
	const passwordPepper = 'test-pepper'
	const validPassword = 'Secret123!'
	const resetPassword = 'Reset123!'
	const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
	const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
	let fakeDatabase: ReturnType<typeof buildTestApp>['fakeDatabase']
	let app: ReturnType<typeof buildTestApp>['app']

	beforeEach(() => {
		;({ app, fakeDatabase } = buildTestApp({ passwordPepper }))
	})

	afterEach(async () => {
		await app.close()
	})

	const seedUser = async (user: UserRow) => {
		fakeDatabase.seedUser(user)
	}

	const login = async (email: string, password: string) => {
		const response = await app.inject({
			method: 'POST',
			url: '/login',
			payload: {
				email,
				password,
			},
		})

		return {
			response,
			cookie: getSessionCookie(response.headers['set-cookie']),
		}
	}

	it('allows admins to create users', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'POST',
			url: '/users',
			headers: {
				cookie,
			},
			payload: {
				name: 'Created',
				lastname: 'User',
				email: 'created@example.com',
				role: 'user',
			},
		})

		expect(response.statusCode).toBe(201)
		expect(response.json()).toEqual({
			message: 'User created successfully',
			userID: expect.any(String),
		})
	})

	it('returns the admin user list without deleted users', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			passwordHash,
			emailVerifiedAt: null,
		})

		await seedUser({
			id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			role: 'user',
			name: 'Deleted',
			lastname: 'User',
			email: 'deleted@example.com',
			passwordHash,
			emailVerifiedAt: null,
			deletedAt: '2026-03-25T01:00:00.000Z',
			isActive: false,
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/users',
			headers: {
				cookie,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: adminId,
					email: 'admin@example.com',
					role: 'admin',
					isActive: true,
				}),
				expect.objectContaining({
					id: userId,
					email: 'user@example.com',
					role: 'user',
					isActive: true,
				}),
			]),
		)
		expect(response.json()).toHaveLength(2)

		const inclusiveResponse = await app.inject({
			method: 'GET',
			url: '/users?includeInactive=true',
			headers: {
				cookie,
			},
		})

		expect(inclusiveResponse.statusCode).toBe(200)
		expect(inclusiveResponse.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: adminId,
					email: 'admin@example.com',
					role: 'admin',
					isActive: true,
				}),
				expect.objectContaining({
					id: userId,
					email: 'user@example.com',
					role: 'user',
					isActive: true,
				}),
				expect.objectContaining({
					id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
					email: 'deleted@example.com',
					role: 'user',
					isActive: false,
				}),
			]),
		)
	})

	it('returns one user for admin management', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			passwordHash,
			emailVerifiedAt: null,
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: `/users/${userId}`,
			headers: {
				cookie,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(
			expect.objectContaining({
				id: userId,
				email: 'user@example.com',
				role: 'user',
				isActive: true,
			}),
		)
	})

	it('allows users to update only their own profile via /users/me', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const updateResponse = await app.inject({
			method: 'PATCH',
			url: '/users/me',
			headers: {
				cookie,
			},
			payload: {
				name: 'Updated',
				email: 'updated@example.com',
			},
		})

		expect(updateResponse.statusCode).toBe(200)
		expect(updateResponse.json()).toEqual({
			id: userId,
			role: 'user',
			name: 'Updated',
			lastname: 'User',
			email: 'updated@example.com',
			isActive: true,
			emailVerifiedAt: null,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			deletedAt: null,
		})

		const meResponse = await app.inject({
			method: 'GET',
			url: '/me',
			headers: {
				cookie,
			},
		})

		expect(meResponse.statusCode).toBe(200)
		expect(meResponse.json()).toEqual({
			id: userId,
			role: 'user',
			name: 'Updated',
			lastname: 'User',
			email: 'updated@example.com',
			isActive: true,
			emailVerifiedAt: null,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			deletedAt: null,
		})
	})

	it('rejects duplicate email updates on /users/me', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
			role: 'user',
			name: 'Other',
			lastname: 'User',
			email: 'other@example.com',
			passwordHash,
			emailVerifiedAt: null,
		})

		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'PATCH',
			url: '/users/me',
			headers: {
				cookie,
			},
			payload: {
				email: 'other@example.com',
			},
		})

		expect(response.statusCode).toBe(409)
		expect(response.json()).toEqual({
			statusCode: 409,
			error: 'ConflictError',
			message: 'Email already in use',
		})
	})

	it('allows admins to update role and reactivate deleted users', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			passwordHash,
			emailVerifiedAt: null,
			deletedAt: '2026-03-25T01:00:00.000Z',
			isActive: false,
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'PATCH',
			url: `/users/${userId}`,
			headers: {
				cookie,
			},
			payload: {
				role: 'admin',
				isActive: true,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({
			id: userId,
			role: 'admin',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			isActive: true,
			emailVerifiedAt: null,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			deletedAt: null,
		})
	})

	it('prevents admins from managing their own lifecycle', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'PATCH',
			url: `/users/${adminId}`,
			headers: {
				cookie,
			},
			payload: {
				isActive: false,
			},
		})

		expect(response.statusCode).toBe(403)
		expect(response.json()).toEqual({
			statusCode: 403,
			error: 'Forbidden',
			message: 'Admins cannot manage their own account lifecycle',
		})
	})

	it('allows admins to reset a user password', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			passwordHash,
			emailVerifiedAt: null,
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const resetResponse = await app.inject({
			method: 'POST',
			url: `/users/${userId}/reset-password`,
			headers: {
				cookie,
			},
			payload: {
				password: resetPassword,
			},
		})

		expect(resetResponse.statusCode).toBe(200)
		expect(resetResponse.json()).toEqual({
			message: 'Password reset successfully',
		})

		const loginResponse = await app.inject({
			method: 'POST',
			url: '/login',
			payload: {
				email: 'user@example.com',
				password: resetPassword,
			},
		})

		expect(loginResponse.statusCode).toBe(200)
	})

	it('prevents admins from deleting their own account and soft deletes other users', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Regular',
			lastname: 'User',
			email: 'user@example.com',
			passwordHash,
			emailVerifiedAt: null,
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const selfDeleteResponse = await app.inject({
			method: 'DELETE',
			url: `/users/${adminId}`,
			headers: {
				cookie,
			},
		})

		expect(selfDeleteResponse.statusCode).toBe(403)
		expect(selfDeleteResponse.json()).toEqual({
			statusCode: 403,
			error: 'Forbidden',
			message: 'Admins cannot delete their own account',
		})

		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: `/users/${userId}`,
			headers: {
				cookie,
			},
		})

		expect(deleteResponse.statusCode).toBe(200)
		expect(deleteResponse.json()).toEqual({
			message: 'User deleted successfully',
		})

		const getResponse = await app.inject({
			method: 'GET',
			url: `/users/${userId}`,
			headers: {
				cookie,
			},
		})

		expect(getResponse.statusCode).toBe(404)

		const repeatedDeleteResponse = await app.inject({
			method: 'DELETE',
			url: `/users/${userId}`,
			headers: {
				cookie,
			},
		})

		expect(repeatedDeleteResponse.statusCode).toBe(404)
		expect(repeatedDeleteResponse.json()).toEqual({
			statusCode: 404,
			error: 'Not Found',
			message: 'User not found',
		})
	})
})
