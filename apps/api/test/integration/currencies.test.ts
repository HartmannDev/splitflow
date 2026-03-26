import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { CurrencyRow, UserRow } from '../helpers/fake-db.ts'

describe('currencies integration', () => {
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

	const seedCurrency = (currency: CurrencyRow) => {
		fakeDatabase.seedCurrency(currency)
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

	it('allows admins to list currencies and optionally include inactive and deleted ones', async () => {
		await seedSessionUsers()

		seedCurrency({
			code: 'USD',
			name: 'US Dollar',
			symbol: '$',
			decimalPlaces: 2,
			isActive: true,
		})
		seedCurrency({
			code: 'BRL',
			name: 'Brazilian Real',
			symbol: 'R$',
			decimalPlaces: 2,
			isActive: false,
		})
		seedCurrency({
			code: 'AUD',
			name: 'Australian Dollar',
			symbol: 'A$',
			decimalPlaces: 2,
			isActive: false,
			deletedAt: '2026-03-25T01:00:00.000Z',
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/currencies',
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([
			expect.objectContaining({
				code: 'USD',
				isActive: true,
				deletedAt: null,
			}),
		])

		const inclusiveResponse = await app.inject({
			method: 'GET',
			url: '/currencies?includeInactive=true&includeDeleted=true',
			headers: { cookie },
		})

		expect(inclusiveResponse.statusCode).toBe(200)
		expect(inclusiveResponse.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'USD', isActive: true, deletedAt: null }),
				expect.objectContaining({ code: 'BRL', isActive: false, deletedAt: null }),
				expect.objectContaining({ code: 'AUD', isActive: false, deletedAt: '2026-03-25T01:00:00.000Z' }),
			]),
		)
	})

	it('allows admins to create currencies with immutable uppercase code', async () => {
		await seedSessionUsers()
		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'POST',
			url: '/currencies',
			headers: { cookie },
			payload: {
				code: 'usd',
				name: 'US Dollar',
				symbol: '$',
				decimalPlaces: 2,
			},
		})

		expect(response.statusCode).toBe(201)
		expect(response.json()).toEqual({
			message: 'Currency created successfully',
			code: 'USD',
		})
	})

	it('rejects duplicate currency codes', async () => {
		await seedSessionUsers()
		seedCurrency({
			code: 'USD',
			name: 'US Dollar',
			symbol: '$',
			decimalPlaces: 2,
		})

		const { cookie } = await login('admin@example.com', validPassword)
		const response = await app.inject({
			method: 'POST',
			url: '/currencies',
			headers: { cookie },
			payload: {
				code: 'USD',
				name: 'Duplicate',
				symbol: '$',
				decimalPlaces: 2,
			},
		})

		expect(response.statusCode).toBe(409)
		expect(response.json()).toEqual({
			statusCode: 409,
			error: 'ConflictError',
			message: 'Currency code already exists',
		})
	})

	it('allows admins to update currency metadata and reactivate a deleted currency', async () => {
		await seedSessionUsers()
		seedCurrency({
			code: 'AUD',
			name: 'Australian Dollar',
			symbol: 'A$',
			decimalPlaces: 2,
			isActive: false,
			deletedAt: '2026-03-25T01:00:00.000Z',
		})

		const { cookie } = await login('admin@example.com', validPassword)
		const response = await app.inject({
			method: 'PATCH',
			url: '/currencies/aud',
			headers: { cookie },
			payload: {
				name: 'Australian Dollar Updated',
				symbol: 'AU$',
				decimalPlaces: 2,
				isActive: true,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(
			expect.objectContaining({
				code: 'AUD',
				name: 'Australian Dollar Updated',
				symbol: 'AU$',
				isActive: true,
				deletedAt: null,
			}),
		)
	})

	it('soft deletes currencies and prevents repeated deletion', async () => {
		await seedSessionUsers()
		seedCurrency({
			code: 'EUR',
			name: 'Euro',
			symbol: 'E',
			decimalPlaces: 2,
		})

		const { cookie } = await login('admin@example.com', validPassword)
		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: '/currencies/eur',
			headers: { cookie },
		})

		expect(deleteResponse.statusCode).toBe(200)
		expect(deleteResponse.json()).toEqual({
			message: 'Currency deleted successfully',
		})

		const repeatedDeleteResponse = await app.inject({
			method: 'DELETE',
			url: '/currencies/eur',
			headers: { cookie },
		})

		expect(repeatedDeleteResponse.statusCode).toBe(404)
		expect(repeatedDeleteResponse.json()).toEqual({
			statusCode: 404,
			error: 'Not Found',
			message: 'Currency not found',
		})
	})

	it('blocks non-admin access to currency management', async () => {
		await seedSessionUsers()
		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/currencies',
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
