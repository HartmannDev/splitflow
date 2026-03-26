import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { ContactRow, UserRow } from '../helpers/fake-db.ts'

describe('contacts integration', () => {
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

	const seedContact = (contact: ContactRow) => {
		fakeDatabase.seedContact(contact)
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

	it('returns only the current user contacts by default and can include deleted ones', async () => {
		await seedSessionUsers()

		seedContact({
			id: '30000000-0000-4000-8000-000000000001',
			userId,
			name: 'Alice',
			email: 'alice@example.com',
		})
		seedContact({
			id: '30000000-0000-4000-8000-000000000002',
			userId,
			name: 'Bob',
			email: null,
			deletedAt: '2026-03-25T01:00:00.000Z',
		})
		seedContact({
			id: '30000000-0000-4000-8000-000000000003',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			name: 'Hidden',
			email: 'hidden@example.com',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/contacts',
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([
			expect.objectContaining({
				id: '30000000-0000-4000-8000-000000000001',
				name: 'Alice',
				email: 'alice@example.com',
				deletedAt: null,
			}),
		])

		const inclusiveResponse = await app.inject({
			method: 'GET',
			url: '/contacts?includeDeleted=true',
			headers: { cookie },
		})

		expect(inclusiveResponse.statusCode).toBe(200)
		expect(inclusiveResponse.json()).toHaveLength(2)
	})

	it('creates contacts and normalizes email casing', async () => {
		await seedSessionUsers()
		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'POST',
			url: '/contacts',
			headers: { cookie },
			payload: {
				name: '  Charlie  ',
				email: 'Charlie@Example.com',
			},
		})

		expect(response.statusCode).toBe(201)
		expect(response.json()).toEqual({
			message: 'Contact created successfully',
			contactId: expect.any(String),
		})

		const getResponse = await app.inject({
			method: 'GET',
			url: '/contacts',
			headers: { cookie },
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual([
			expect.objectContaining({
				name: 'Charlie',
				email: 'charlie@example.com',
			}),
		])
	})

	it('allows duplicate null emails but prevents duplicate email per owner', async () => {
		await seedSessionUsers()
		seedContact({
			id: '30000000-0000-4000-8000-000000000010',
			userId,
			name: 'Existing',
			email: 'duplicate@example.com',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const duplicateResponse = await app.inject({
			method: 'POST',
			url: '/contacts',
			headers: { cookie },
			payload: {
				name: 'Duplicate',
				email: 'DUPLICATE@example.com',
			},
		})

		expect(duplicateResponse.statusCode).toBe(409)
		expect(duplicateResponse.json()).toEqual({
			statusCode: 409,
			error: 'ConflictError',
			message: 'Contact email already in use',
		})

		const firstNullEmailResponse = await app.inject({
			method: 'POST',
			url: '/contacts',
			headers: { cookie },
			payload: {
				name: 'No Email 1',
			},
		})

		const secondNullEmailResponse = await app.inject({
			method: 'POST',
			url: '/contacts',
			headers: { cookie },
			payload: {
				name: 'No Email 2',
			},
		})

		expect(firstNullEmailResponse.statusCode).toBe(201)
		expect(secondNullEmailResponse.statusCode).toBe(201)
	})

	it('updates contacts and allows clearing the email', async () => {
		await seedSessionUsers()
		seedContact({
			id: '30000000-0000-4000-8000-000000000020',
			userId,
			name: 'Diana',
			email: 'diana@example.com',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'PATCH',
			url: '/contacts/30000000-0000-4000-8000-000000000020',
			headers: { cookie },
			payload: {
				name: 'Diana Prince',
				email: null,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(
			expect.objectContaining({
				id: '30000000-0000-4000-8000-000000000020',
				name: 'Diana Prince',
				email: null,
			}),
		)
	})

	it('soft deletes contacts and prevents access to other users contacts', async () => {
		await seedSessionUsers()
		seedContact({
			id: '30000000-0000-4000-8000-000000000030',
			userId,
			name: 'Erin',
			email: 'erin@example.com',
		})
		seedContact({
			id: '30000000-0000-4000-8000-000000000031',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			name: 'Other User',
			email: 'other@example.com',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: '/contacts/30000000-0000-4000-8000-000000000030',
			headers: { cookie },
		})

		expect(deleteResponse.statusCode).toBe(200)
		expect(deleteResponse.json()).toEqual({
			message: 'Contact deleted successfully',
		})

		const updateResponse = await app.inject({
			method: 'PATCH',
			url: '/contacts/30000000-0000-4000-8000-000000000031',
			headers: { cookie },
			payload: {
				name: 'Should Fail',
			},
		})

		expect(updateResponse.statusCode).toBe(404)
		expect(updateResponse.json()).toEqual({
			statusCode: 404,
			error: 'Not Found',
			message: 'Contact not found',
		})
	})

	it('blocks admin access to contacts because they are private user data', async () => {
		await seedSessionUsers()
		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/contacts',
			headers: { cookie },
		})

		expect(response.statusCode).toBe(403)
		expect(response.json()).toEqual({
			statusCode: 403,
			error: 'Forbidden',
			message: 'You do not have permission to access this resource',
		})
	})
})
