import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { AccountRow, CurrencyRow, UserRow } from '../helpers/fake-db.ts'

describe('accounts integration', () => {
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

	const seedAccount = (account: AccountRow) => {
		fakeDatabase.seedAccount(account)
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

	const seedCurrencies = () => {
		seedCurrency({
			code: 'USD',
			name: 'US Dollar',
			symbol: '$',
			decimalPlaces: 2,
		})
		seedCurrency({
			code: 'EUR',
			name: 'Euro',
			symbol: 'E',
			decimalPlaces: 2,
		})
	}

	it('returns only active accounts by default and can include archived accounts when requested', async () => {
		await seedSessionUsers()
		seedCurrencies()

		seedAccount({
			id: '20000000-0000-4000-8000-000000000001',
			userId,
			currencyCode: 'USD',
			name: 'Checking',
			icon: 'wallet',
			color: '#2563eb',
			initialValue: '100.50',
		})
		seedAccount({
			id: '20000000-0000-4000-8000-000000000002',
			userId,
			currencyCode: 'EUR',
			name: 'Old Savings',
			icon: 'piggy-bank',
			color: '#7c3aed',
			initialValue: '50.00',
			isArchived: true,
		})
		seedAccount({
			id: '20000000-0000-4000-8000-000000000003',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			currencyCode: 'USD',
			name: 'Hidden',
			icon: 'lock',
			color: '#6b7280',
			initialValue: '10.00',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/accounts',
			headers: {
				cookie,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([
			expect.objectContaining({
				id: '20000000-0000-4000-8000-000000000001',
				name: 'Checking',
				currencyCode: 'USD',
				initialValue: '100.50',
				isArchived: false,
			}),
		])

		const includeArchivedResponse = await app.inject({
			method: 'GET',
			url: '/accounts?includeArchived=true',
			headers: {
				cookie,
			},
		})

		expect(includeArchivedResponse.statusCode).toBe(200)
		expect(includeArchivedResponse.json()).toHaveLength(2)
	})

	it('creates accounts for users and validates currency existence', async () => {
		await seedSessionUsers()
		seedCurrencies()

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'POST',
			url: '/accounts',
			headers: {
				cookie,
			},
			payload: {
				currencyCode: 'usd',
				name: '  Main Account  ',
				icon: 'building-bank',
				color: '  #0f172a  ',
				initialValue: '25.123456',
			},
		})

		expect(response.statusCode).toBe(201)
		expect(response.json()).toEqual({
			message: 'Account created successfully',
			accountId: expect.any(String),
		})

		const getResponse = await app.inject({
			method: 'GET',
			url: '/accounts',
			headers: {
				cookie,
			},
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual([
			expect.objectContaining({
				name: 'Main Account',
				icon: 'building-bank',
				color: '#0f172a',
				currencyCode: 'USD',
				initialValue: '25.123456',
				isArchived: false,
			}),
		])

		const invalidCurrencyResponse = await app.inject({
			method: 'POST',
			url: '/accounts',
			headers: {
				cookie,
			},
			payload: {
				currencyCode: 'BRL',
				name: 'Invalid',
				icon: 'x',
				color: '#111827',
				initialValue: '0',
			},
		})

		expect(invalidCurrencyResponse.statusCode).toBe(400)
		expect(invalidCurrencyResponse.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Currency not found',
		})
	})

	it('updates accounts including initial value and archived state', async () => {
		await seedSessionUsers()
		seedCurrencies()

		seedAccount({
			id: '20000000-0000-4000-8000-000000000020',
			userId,
			currencyCode: 'USD',
			name: 'Savings',
			icon: 'piggy-bank',
			color: '#9333ea',
			initialValue: '1000',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'PATCH',
			url: '/accounts/20000000-0000-4000-8000-000000000020',
			headers: {
				cookie,
			},
			payload: {
				currencyCode: 'EUR',
				name: 'Emergency Fund',
				icon: 'shield-dollar-sign',
				color: '#1d4ed8',
				initialValue: '-25.50',
				isArchived: true,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(
			expect.objectContaining({
				id: '20000000-0000-4000-8000-000000000020',
				currencyCode: 'EUR',
				name: 'Emergency Fund',
				icon: 'shield-dollar-sign',
				color: '#1d4ed8',
				initialValue: '-25.50',
				isArchived: true,
			}),
		)
	})

	it('soft deletes accounts and keeps them out of active listings', async () => {
		await seedSessionUsers()
		seedCurrencies()

		seedAccount({
			id: '20000000-0000-4000-8000-000000000030',
			userId,
			currencyCode: 'USD',
			name: 'Disposable',
			icon: 'trash-2',
			color: '#ef4444',
			initialValue: '0',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: '/accounts/20000000-0000-4000-8000-000000000030',
			headers: {
				cookie,
			},
		})

		expect(deleteResponse.statusCode).toBe(200)
		expect(deleteResponse.json()).toEqual({
			message: 'Account deleted successfully',
		})

		const getResponse = await app.inject({
			method: 'GET',
			url: '/accounts?includeArchived=true',
			headers: {
				cookie,
			},
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual([])
	})

	it('rejects admins and prevents access to other users accounts', async () => {
		await seedSessionUsers()
		seedCurrencies()

		seedAccount({
			id: '20000000-0000-4000-8000-000000000040',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			currencyCode: 'USD',
			name: 'Other User',
			icon: 'user',
			color: '#64748b',
			initialValue: '5',
		})

		const { cookie: adminCookie } = await login('admin@example.com', validPassword)
		const adminResponse = await app.inject({
			method: 'GET',
			url: '/accounts',
			headers: {
				cookie: adminCookie,
			},
		})

		expect(adminResponse.statusCode).toBe(403)

		const { cookie: userCookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'PATCH',
			url: '/accounts/20000000-0000-4000-8000-000000000040',
			headers: {
				cookie: userCookie,
			},
			payload: {
				name: 'Should Fail',
			},
		})

		expect(response.statusCode).toBe(404)
		expect(response.json()).toEqual({
			statusCode: 404,
			error: 'Not Found',
			message: 'Account not found',
		})
	})
})
