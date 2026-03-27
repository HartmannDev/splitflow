import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { AccountRow, CategoryRow, TagRow, TransactionRow as FakeTransactionRow, TransactionTagRow, UserRow } from '../helpers/fake-db.ts'

describe('transactions integration', () => {
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
	const seedTag = (tag: TagRow) => fakeDatabase.seedTag(tag)
	const seedTransaction = (transaction: FakeTransactionRow) => fakeDatabase.seedTransaction(transaction)
	const seedTransactionTag = (transactionTag: TransactionTagRow) => fakeDatabase.seedTransactionTag(transactionTag)

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

	const seedTransactionDependencies = () => {
		seedAccount({
			id: '60000000-0000-4000-8000-000000000001',
			userId,
			currencyCode: 'USD',
			name: 'Checking',
			icon: 'wallet',
			color: '#2563eb',
			initialValue: '0',
		})
		seedAccount({
			id: '60000000-0000-4000-8000-000000000002',
			userId,
			currencyCode: 'USD',
			name: 'Savings',
			icon: 'piggy-bank',
			color: '#7c3aed',
			initialValue: '0',
		})
		seedAccount({
			id: '60000000-0000-4000-8000-000000000003',
			userId,
			currencyCode: 'EUR',
			name: 'Euro Wallet',
			icon: 'banknote',
			color: '#16a34a',
			initialValue: '0',
		})
		seedCategory({
			id: '60000000-0000-4000-8000-000000000010',
			userId: null,
			type: 'expense',
			name: 'Food',
			icon: 'fork-knife',
			color: '#22c55e',
			isDefault: true,
		})
		seedCategory({
			id: '60000000-0000-4000-8000-000000000011',
			userId,
			type: 'income',
			name: 'Salary',
			icon: 'wallet',
			color: '#16a34a',
			isDefault: false,
		})
		seedTag({
			id: '60000000-0000-4000-8000-000000000020',
			userId,
			name: 'Important',
			color: '#f59e0b',
		})
		seedTag({
			id: '60000000-0000-4000-8000-000000000021',
			userId,
			name: 'Monthly',
			color: '#0ea5e9',
		})
	}

	it('creates and lists normal transactions with tags', async () => {
		await seedSessionUsers()
		seedTransactionDependencies()

		const { cookie } = await login('user@example.com', validPassword)
		const createResponse = await app.inject({
			method: 'POST',
			url: '/transactions',
			headers: { cookie },
			payload: {
				type: 'expense',
				status: 'pending',
				amount: '25.500000',
				description: ' Lunch ',
				notes: ' Team meal ',
				transactionDate: '2026-03-27T10:00:00.000Z',
				accountId: '60000000-0000-4000-8000-000000000001',
				categoryId: '60000000-0000-4000-8000-000000000010',
				tagIds: ['60000000-0000-4000-8000-000000000020', '60000000-0000-4000-8000-000000000021'],
			},
		})

		expect(createResponse.statusCode).toBe(201)

		const listResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual([
			expect.objectContaining({
				type: 'expense',
				status: 'pending',
				amount: '25.500000',
				description: 'Lunch',
				notes: 'Team meal',
				accountId: '60000000-0000-4000-8000-000000000001',
				categoryId: '60000000-0000-4000-8000-000000000010',
				tagIds: ['60000000-0000-4000-8000-000000000020', '60000000-0000-4000-8000-000000000021'],
				transferPairId: null,
				transferDirection: null,
			}),
		])
	})

	it('filters transactions by period, account, type, status, category, and tag', async () => {
		await seedSessionUsers()
		seedTransactionDependencies()

		seedTransaction({
			id: '60000000-0000-4000-8000-000000000050',
			userId,
			type: 'expense',
			status: 'pending',
			amount: '45',
			description: 'Groceries',
			transactionDate: '2026-03-10T10:00:00.000Z',
			accountId: '60000000-0000-4000-8000-000000000001',
			categoryId: '60000000-0000-4000-8000-000000000010',
		})
		seedTransactionTag({
			id: '61000000-0000-4000-8000-000000000010',
			transactionId: '60000000-0000-4000-8000-000000000050',
			tagId: '60000000-0000-4000-8000-000000000020',
		})

		seedTransaction({
			id: '60000000-0000-4000-8000-000000000051',
			userId,
			type: 'expense',
			status: 'done',
			amount: '60',
			description: 'Dinner',
			transactionDate: '2026-03-18T20:00:00.000Z',
			accountId: '60000000-0000-4000-8000-000000000001',
			categoryId: '60000000-0000-4000-8000-000000000010',
		})
		seedTransactionTag({
			id: '61000000-0000-4000-8000-000000000011',
			transactionId: '60000000-0000-4000-8000-000000000051',
			tagId: '60000000-0000-4000-8000-000000000021',
		})

		seedTransaction({
			id: '60000000-0000-4000-8000-000000000052',
			userId,
			type: 'income',
			status: 'done',
			amount: '5000',
			description: 'Salary',
			transactionDate: '2026-03-12T09:00:00.000Z',
			accountId: '60000000-0000-4000-8000-000000000002',
			categoryId: '60000000-0000-4000-8000-000000000011',
		})
		seedTransactionTag({
			id: '61000000-0000-4000-8000-000000000012',
			transactionId: '60000000-0000-4000-8000-000000000052',
			tagId: '60000000-0000-4000-8000-000000000020',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'GET',
			url:
				'/transactions?from=2026-03-01T00:00:00.000Z&to=2026-03-15T23:59:59.999Z&accountId=60000000-0000-4000-8000-000000000001&type=expense&status=pending&categoryId=60000000-0000-4000-8000-000000000010&tagId=60000000-0000-4000-8000-000000000020',
			headers: { cookie },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([
			expect.objectContaining({
				id: '60000000-0000-4000-8000-000000000050',
				description: 'Groceries',
				type: 'expense',
				status: 'pending',
				accountId: '60000000-0000-4000-8000-000000000001',
				categoryId: '60000000-0000-4000-8000-000000000010',
				tagIds: ['60000000-0000-4000-8000-000000000020'],
			}),
		])
	})

	it('validates account, category, and tag ownership', async () => {
		await seedSessionUsers()
		seedTransactionDependencies()
		seedTag({
			id: '60000000-0000-4000-8000-000000000022',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			name: 'Other User',
			color: '#111827',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const invalidCategoryResponse = await app.inject({
			method: 'POST',
			url: '/transactions',
			headers: { cookie },
			payload: {
				type: 'income',
				amount: '100',
				description: 'Salary',
				transactionDate: '2026-03-27T10:00:00.000Z',
				accountId: '60000000-0000-4000-8000-000000000001',
				categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
			},
		})

		expect(invalidCategoryResponse.statusCode).toBe(400)

		const invalidTagResponse = await app.inject({
			method: 'POST',
			url: '/transactions',
			headers: { cookie },
			payload: {
				type: 'income',
				amount: '100',
				description: 'Salary',
				transactionDate: '2026-03-27T10:00:00.000Z',
				accountId: '60000000-0000-4000-8000-000000000001',
				tagIds: ['60000000-0000-4000-8000-000000000022'],
			},
		})

		expect(invalidTagResponse.statusCode).toBe(400)
		expect(invalidTagResponse.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'All tags must belong to the current user',
		})
	})

	it('creates transfer pairs and enforces same-currency amount matching', async () => {
		await seedSessionUsers()
		seedTransactionDependencies()

		const { cookie } = await login('user@example.com', validPassword)

		const invalidSameCurrencyResponse = await app.inject({
			method: 'POST',
			url: '/transactions/transfers',
			headers: { cookie },
			payload: {
				fromAccountId: '60000000-0000-4000-8000-000000000001',
				toAccountId: '60000000-0000-4000-8000-000000000002',
				fromAmount: '10',
				toAmount: '11',
				description: 'Invalid transfer',
				transactionDate: '2026-03-27T10:00:00.000Z',
			},
		})

		expect(invalidSameCurrencyResponse.statusCode).toBe(400)
		expect(invalidSameCurrencyResponse.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Transfer amounts must match for the same currency',
		})

		const validTransferResponse = await app.inject({
			method: 'POST',
			url: '/transactions/transfers',
			headers: { cookie },
			payload: {
				status: 'done',
				fromAccountId: '60000000-0000-4000-8000-000000000001',
				toAccountId: '60000000-0000-4000-8000-000000000003',
				fromAmount: '100',
				toAmount: '92',
				description: 'FX transfer',
				notes: 'manual rate',
				transactionDate: '2026-03-27T10:00:00.000Z',
				tagIds: ['60000000-0000-4000-8000-000000000020'],
			},
		})

		expect(validTransferResponse.statusCode).toBe(201)
		expect(validTransferResponse.json()).toEqual({
			message: 'Transfer created successfully',
			transferPairId: expect.any(String),
			outTransactionId: expect.any(String),
			inTransactionId: expect.any(String),
		})

		const listResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'transfer',
					amount: '100',
					accountId: '60000000-0000-4000-8000-000000000001',
					transferDirection: 'out',
					tagIds: ['60000000-0000-4000-8000-000000000020'],
				}),
				expect.objectContaining({
					type: 'transfer',
					amount: '92',
					accountId: '60000000-0000-4000-8000-000000000003',
					transferDirection: 'in',
					tagIds: ['60000000-0000-4000-8000-000000000020'],
				}),
			]),
		)
	})

	it('updates only non-transfer transactions and replaces tags', async () => {
		await seedSessionUsers()
		seedTransactionDependencies()

		seedTransaction({
			id: '60000000-0000-4000-8000-000000000030',
			userId,
			type: 'expense',
			status: 'done',
			amount: '20',
			description: 'Dinner',
			notes: null,
			transactionDate: '2026-03-27T10:00:00.000Z',
			accountId: '60000000-0000-4000-8000-000000000001',
			categoryId: '60000000-0000-4000-8000-000000000010',
		})
		seedTransactionTag({
			id: '61000000-0000-4000-8000-000000000001',
			transactionId: '60000000-0000-4000-8000-000000000030',
			tagId: '60000000-0000-4000-8000-000000000020',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'PATCH',
			url: '/transactions/60000000-0000-4000-8000-000000000030',
			headers: { cookie },
			payload: {
				status: 'cancelled',
				amount: '22.5',
				description: 'Dinner with friends',
				tagIds: ['60000000-0000-4000-8000-000000000021'],
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual(
			expect.objectContaining({
				id: '60000000-0000-4000-8000-000000000030',
				status: 'cancelled',
				amount: '22.5',
				description: 'Dinner with friends',
				tagIds: ['60000000-0000-4000-8000-000000000021'],
			}),
		)
	})

	it('deletes transfer pairs together and blocks admin access', async () => {
		await seedSessionUsers()
		seedTransactionDependencies()

		seedTransaction({
			id: '60000000-0000-4000-8000-000000000040',
			userId,
			type: 'transfer',
			status: 'done',
			amount: '50',
			description: 'Move money',
			transactionDate: '2026-03-27T10:00:00.000Z',
			accountId: '60000000-0000-4000-8000-000000000001',
			transferPairId: '62000000-0000-4000-8000-000000000001',
			transferDirection: 'out',
		})
		seedTransaction({
			id: '60000000-0000-4000-8000-000000000041',
			userId,
			type: 'transfer',
			status: 'done',
			amount: '50',
			description: 'Move money',
			transactionDate: '2026-03-27T10:00:00.000Z',
			accountId: '60000000-0000-4000-8000-000000000002',
			transferPairId: '62000000-0000-4000-8000-000000000001',
			transferDirection: 'in',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: '/transactions/60000000-0000-4000-8000-000000000040',
			headers: { cookie },
		})

		expect(deleteResponse.statusCode).toBe(200)
		expect(deleteResponse.json()).toEqual({
			message: 'Transaction deleted successfully',
		})

		const listResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual([])

		const { cookie: adminCookie } = await login('admin@example.com', validPassword)
		const adminResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
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
