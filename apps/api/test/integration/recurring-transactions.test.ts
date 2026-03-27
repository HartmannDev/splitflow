import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { AccountRow, CategoryRow, RecurringTransactionRow, UserRow } from '../helpers/fake-db.ts'

describe('recurring transactions integration', () => {
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
	const seedAccount = (account: AccountRow) => fakeDatabase.seedAccount(account)
	const seedCategory = (category: CategoryRow) => fakeDatabase.seedCategory(category)
	const seedRecurringTransaction = (recurringTransaction: RecurringTransactionRow) =>
		fakeDatabase.seedRecurringTransaction(recurringTransaction)

	const login = async (email: string, password: string) => {
		const response = await app.inject({
			method: 'POST',
			url: '/login',
			payload: { email, password },
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

	const seedRecurringDependencies = () => {
		seedAccount({
			id: '70000000-0000-4000-8000-000000000001',
			userId,
			currencyCode: 'USD',
			name: 'Checking',
			icon: 'wallet',
			color: '#2563eb',
			initialValue: '0',
		})
		seedCategory({
			id: '70000000-0000-4000-8000-000000000010',
			userId,
			type: 'expense',
			name: 'Subscriptions',
			icon: 'repeat',
			color: '#22c55e',
			isDefault: false,
		})
	}

	it('creates and lists recurring transaction templates', async () => {
		await seedSessionUsers()
		seedRecurringDependencies()

		const { cookie } = await login('user@example.com', validPassword)
		const createResponse = await app.inject({
			method: 'POST',
			url: '/recurring-transactions',
			headers: { cookie },
			payload: {
				type: 'expense',
				mode: 'subscription',
				frequency: 'monthly',
				templateDescription: ' Netflix ',
				templateAmount: '19.99',
				templateNotes: ' streaming ',
				templateCategoryId: '70000000-0000-4000-8000-000000000010',
				templateAccountId: '70000000-0000-4000-8000-000000000001',
				startsOn: '2026-03-01',
			},
		})

		expect(createResponse.statusCode).toBe(201)

		const listResponse = await app.inject({
			method: 'GET',
			url: '/recurring-transactions',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual([
			expect.objectContaining({
				type: 'expense',
				mode: 'subscription',
				frequency: 'monthly',
				templateDescription: 'Netflix',
				templateAmount: '19.99',
				templateNotes: 'streaming',
				nextGenerationDate: '2026-03-01',
				currentVersion: 1,
				isActive: true,
			}),
		])
	})

	it('updates recurring templates for future occurrences and increments version', async () => {
		await seedSessionUsers()
		seedRecurringDependencies()
		seedRecurringTransaction({
			id: '70000000-0000-4000-8000-000000000020',
			userId,
			type: 'expense',
			mode: 'subscription',
			frequency: 'monthly',
			templateDescription: 'Netflix',
			templateAmount: '19.99',
			templateCategoryId: '70000000-0000-4000-8000-000000000010',
			templateAccountId: '70000000-0000-4000-8000-000000000001',
			startsOn: '2026-03-01',
			nextGenerationDate: '2026-03-01',
			currentVersion: 1,
		})

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'PATCH',
			url: '/recurring-transactions/70000000-0000-4000-8000-000000000020',
			headers: { cookie },
			payload: {
				templateDescription: 'Netflix Premium',
				templateAmount: '25.99',
				isActive: false,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(
			expect.objectContaining({
				id: '70000000-0000-4000-8000-000000000020',
				templateDescription: 'Netflix Premium',
				templateAmount: '25.99',
				currentVersion: 2,
				isActive: false,
			}),
		)
	})

	it('generates due recurring transactions as pending ledger rows', async () => {
		await seedSessionUsers()
		seedRecurringDependencies()
		seedRecurringTransaction({
			id: '70000000-0000-4000-8000-000000000030',
			userId,
			type: 'expense',
			mode: 'subscription',
			frequency: 'monthly',
			templateDescription: 'Gym',
			templateAmount: '50',
			templateCategoryId: '70000000-0000-4000-8000-000000000010',
			templateAccountId: '70000000-0000-4000-8000-000000000001',
			startsOn: '2026-01-01',
			nextGenerationDate: '2026-01-01',
			currentVersion: 3,
		})

		const { cookie } = await login('user@example.com', validPassword)
		const generateResponse = await app.inject({
			method: 'POST',
			url: '/recurring-transactions/generate-due',
			headers: { cookie },
			payload: {
				throughDate: '2026-03-15',
			},
		})

		expect(generateResponse.statusCode).toBe(200)
		expect(generateResponse.json()).toEqual({
			message: 'Due recurring transactions generated successfully',
			generatedCount: 3,
			transactionIds: expect.arrayContaining([expect.any(String)]),
		})

		const transactionsResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie },
		})

		expect(transactionsResponse.statusCode).toBe(200)
		expect(transactionsResponse.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'expense',
					status: 'pending',
					description: 'Gym',
					recurringTransactionId: '70000000-0000-4000-8000-000000000030',
					recurringVersion: 3,
				}),
			]),
		)

		const recurringResponse = await app.inject({
			method: 'GET',
			url: '/recurring-transactions/70000000-0000-4000-8000-000000000030',
			headers: { cookie },
		})

		expect(recurringResponse.statusCode).toBe(200)
		expect(recurringResponse.json()).toEqual(
			expect.objectContaining({
				nextGenerationDate: '2026-04-01',
				isActive: true,
			}),
		)
	})

	it('deactivates installment templates after reaching total occurrences and blocks admin access', async () => {
		await seedSessionUsers()
		seedRecurringDependencies()
		seedRecurringTransaction({
			id: '70000000-0000-4000-8000-000000000040',
			userId,
			type: 'expense',
			mode: 'installment',
			frequency: 'monthly',
			templateDescription: 'Laptop',
			templateAmount: '100',
			templateCategoryId: '70000000-0000-4000-8000-000000000010',
			templateAccountId: '70000000-0000-4000-8000-000000000001',
			startsOn: '2026-01-01',
			nextGenerationDate: '2026-01-01',
			totalOccurrences: 2,
		})

		const { cookie } = await login('user@example.com', validPassword)
		const generateResponse = await app.inject({
			method: 'POST',
			url: '/recurring-transactions/generate-due',
			headers: { cookie },
			payload: {
				throughDate: '2026-03-15',
			},
		})

		expect(generateResponse.statusCode).toBe(200)
		expect(generateResponse.json()).toEqual(
			expect.objectContaining({
				generatedCount: 2,
			}),
		)

		const recurringResponse = await app.inject({
			method: 'GET',
			url: '/recurring-transactions?includeInactive=true',
			headers: { cookie },
		})

		expect(recurringResponse.statusCode).toBe(200)
		expect(recurringResponse.json()).toEqual([
			expect.objectContaining({
				id: '70000000-0000-4000-8000-000000000040',
				isActive: false,
			}),
		])

		const { cookie: adminCookie } = await login('admin@example.com', validPassword)
		const adminResponse = await app.inject({
			method: 'GET',
			url: '/recurring-transactions',
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
