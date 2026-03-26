import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { TagRow, UserRow } from '../helpers/fake-db.ts'

describe('tags integration', () => {
	const passwordPepper = 'test-pepper'
	const validPassword = 'Secret123!'
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

	const seedTag = (tag: TagRow) => {
		fakeDatabase.seedTag(tag)
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

	const seedSessionUsers = async () => {
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
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})
	}

	it('returns only the current user tags by default and can include deleted ones', async () => {
		await seedSessionUsers()

		seedTag({
			id: '50000000-0000-4000-8000-000000000001',
			userId,
			name: 'Essentials',
			color: '#2563eb',
		})
		seedTag({
			id: '50000000-0000-4000-8000-000000000002',
			userId,
			name: 'Archived',
			color: '#64748b',
			deletedAt: '2026-03-25T01:00:00.000Z',
		})
		seedTag({
			id: '50000000-0000-4000-8000-000000000003',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			name: 'Hidden',
			color: '#ef4444',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/tags',
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([
			expect.objectContaining({
				id: '50000000-0000-4000-8000-000000000001',
				name: 'Essentials',
				color: '#2563eb',
				deletedAt: null,
			}),
		])

		const inclusiveResponse = await app.inject({
			method: 'GET',
			url: '/tags?includeDeleted=true',
			headers: { cookie },
		})

		expect(inclusiveResponse.statusCode).toBe(200)
		expect(inclusiveResponse.json()).toHaveLength(2)
	})

	it('creates tags and rejects duplicate names per owner', async () => {
		await seedSessionUsers()
		seedTag({
			id: '50000000-0000-4000-8000-000000000010',
			userId,
			name: 'Important',
			color: '#f59e0b',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'POST',
			url: '/tags',
			headers: { cookie },
			payload: {
				name: '  Travel  ',
				color: '  #0ea5e9  ',
			},
		})

		expect(response.statusCode).toBe(201)
		expect(response.json()).toEqual({
			message: 'Tag created successfully',
			tagId: expect.any(String),
		})

		const duplicateResponse = await app.inject({
			method: 'POST',
			url: '/tags',
			headers: { cookie },
			payload: {
				name: 'important',
				color: '#111827',
			},
		})

		expect(duplicateResponse.statusCode).toBe(409)
		expect(duplicateResponse.json()).toEqual({
			statusCode: 409,
			error: 'ConflictError',
			message: 'Tag name already in use',
		})
	})

	it('updates tags and preserves ownership boundaries', async () => {
		await seedSessionUsers()
		seedTag({
			id: '50000000-0000-4000-8000-000000000020',
			userId,
			name: 'Bills',
			color: '#7c3aed',
		})
		seedTag({
			id: '50000000-0000-4000-8000-000000000021',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			name: 'Other User',
			color: '#ef4444',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const updateResponse = await app.inject({
			method: 'PATCH',
			url: '/tags/50000000-0000-4000-8000-000000000020',
			headers: { cookie },
			payload: {
				name: 'Monthly Bills',
				color: '#8b5cf6',
			},
		})

		expect(updateResponse.statusCode).toBe(200)
		expect(updateResponse.json()).toEqual(
			expect.objectContaining({
				id: '50000000-0000-4000-8000-000000000020',
				name: 'Monthly Bills',
				color: '#8b5cf6',
			}),
		)

		const forbiddenResponse = await app.inject({
			method: 'PATCH',
			url: '/tags/50000000-0000-4000-8000-000000000021',
			headers: { cookie },
			payload: {
				name: 'Should Fail',
			},
		})

		expect(forbiddenResponse.statusCode).toBe(404)
		expect(forbiddenResponse.json()).toEqual({
			statusCode: 404,
			error: 'Not Found',
			message: 'Tag not found',
		})
	})

	it('soft deletes tags and blocks admin access', async () => {
		await seedSessionUsers()
		seedTag({
			id: '50000000-0000-4000-8000-000000000030',
			userId,
			name: 'Delete Me',
			color: '#dc2626',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: '/tags/50000000-0000-4000-8000-000000000030',
			headers: { cookie },
		})

		expect(deleteResponse.statusCode).toBe(200)
		expect(deleteResponse.json()).toEqual({
			message: 'Tag deleted successfully',
		})

		const listResponse = await app.inject({
			method: 'GET',
			url: '/tags',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual([])

		const { cookie: adminCookie } = await login('admin@example.com', validPassword)
		const adminResponse = await app.inject({
			method: 'GET',
			url: '/tags',
			headers: { cookie: adminCookie },
		})

		expect(adminResponse.statusCode).toBe(403)
		expect(adminResponse.json()).toEqual({
			statusCode: 403,
			error: 'Forbidden',
			message: 'You do not have permission to access this resource',
		})
	})
})
