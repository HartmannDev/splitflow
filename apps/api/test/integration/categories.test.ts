import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { CategoryRow, UserRow } from '../helpers/fake-db.ts'

describe('categories integration', () => {
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

	const seedCategory = (category: CategoryRow) => {
		fakeDatabase.seedCategory(category)
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

	it('returns default and personal categories for a normal user', async () => {
		await seedSessionUsers()

		seedCategory({
			id: '10000000-0000-4000-8000-000000000001',
			userId: null,
			type: 'expense',
			name: 'Food',
			icon: 'fork-knife',
			color: '#22c55e',
			isDefault: true,
		})
		seedCategory({
			id: '10000000-0000-4000-8000-000000000002',
			userId,
			type: 'expense',
			name: 'Pets',
			icon: 'paw-print',
			color: '#f97316',
			isDefault: false,
		})
		seedCategory({
			id: '10000000-0000-4000-8000-000000000003',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			type: 'expense',
			name: 'Hidden',
			icon: 'lock',
			color: '#6b7280',
			isDefault: false,
		})

		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/categories',
			headers: {
				cookie,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([
			expect.objectContaining({
				id: '10000000-0000-4000-8000-000000000001',
				userId: null,
				name: 'Food',
				icon: 'fork-knife',
				color: '#22c55e',
				isDefault: true,
			}),
			expect.objectContaining({
				id: '10000000-0000-4000-8000-000000000002',
				userId,
				name: 'Pets',
				icon: 'paw-print',
				color: '#f97316',
				isDefault: false,
			}),
		])
	})

	it('returns only default categories for admins and rejects personal scope', async () => {
		await seedSessionUsers()

		seedCategory({
			id: '10000000-0000-4000-8000-000000000010',
			userId: null,
			type: 'expense',
			name: 'Travel',
			icon: 'plane',
			color: '#0ea5e9',
			isDefault: true,
		})
		seedCategory({
			id: '10000000-0000-4000-8000-000000000011',
			userId,
			type: 'expense',
			name: 'Private',
			icon: 'shield',
			color: '#ef4444',
			isDefault: false,
		})

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'GET',
			url: '/categories',
			headers: {
				cookie,
			},
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual([
			expect.objectContaining({
				id: '10000000-0000-4000-8000-000000000010',
				userId: null,
				name: 'Travel',
				icon: 'plane',
				color: '#0ea5e9',
				isDefault: true,
			}),
		])

		const invalidScopeResponse = await app.inject({
			method: 'GET',
			url: '/categories?scope=personal',
			headers: {
				cookie,
			},
		})

		expect(invalidScopeResponse.statusCode).toBe(400)
		expect(invalidScopeResponse.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Admins cannot access personal categories',
		})
	})

	it('allows users to create only personal categories', async () => {
		await seedSessionUsers()

		const { cookie } = await login('user@example.com', validPassword)

		const response = await app.inject({
			method: 'POST',
			url: '/categories',
			headers: {
				cookie,
			},
			payload: {
				type: 'expense',
				name: '  Health  ',
				icon: 'heart-pulse',
				color: '  #ec4899  ',
			},
		})

		expect(response.statusCode).toBe(201)
		expect(response.json()).toEqual({
			message: 'Category created successfully',
			categoryId: expect.any(String),
		})

		const getResponse = await app.inject({
			method: 'GET',
			url: '/categories?scope=personal',
			headers: {
				cookie,
			},
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual([
			expect.objectContaining({
				userId,
				name: 'Health',
				type: 'expense',
				icon: 'heart-pulse',
				color: '#ec4899',
				isDefault: false,
			}),
		])

		const forbiddenResponse = await app.inject({
			method: 'POST',
			url: '/categories',
			headers: {
				cookie,
			},
			payload: {
				type: 'expense',
				name: 'System',
				icon: 'sparkles',
				color: '#111827',
				isDefault: true,
			},
		})

		expect(forbiddenResponse.statusCode).toBe(403)
		expect(forbiddenResponse.json()).toEqual({
			statusCode: 403,
			error: 'Forbidden',
			message: 'Users can only create personal categories',
		})
	})

	it('allows admins to create only default categories', async () => {
		await seedSessionUsers()

		const { cookie } = await login('admin@example.com', validPassword)

		const response = await app.inject({
			method: 'POST',
			url: '/categories',
			headers: {
				cookie,
			},
			payload: {
				type: 'income',
				name: 'Salary',
				icon: 'wallet',
				color: '#16a34a',
			},
		})

		expect(response.statusCode).toBe(201)

		const getResponse = await app.inject({
			method: 'GET',
			url: '/categories?type=income',
			headers: {
				cookie,
			},
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual([
			expect.objectContaining({
				userId: null,
				name: 'Salary',
				type: 'income',
				icon: 'wallet',
				color: '#16a34a',
				isDefault: true,
			}),
		])

		const forbiddenResponse = await app.inject({
			method: 'POST',
			url: '/categories',
			headers: {
				cookie,
			},
			payload: {
				type: 'income',
				name: 'Bonus',
				icon: 'coins',
				color: '#f59e0b',
				isDefault: false,
			},
		})

		expect(forbiddenResponse.statusCode).toBe(403)
		expect(forbiddenResponse.json()).toEqual({
			statusCode: 403,
			error: 'Forbidden',
			message: 'Admins can only create default categories',
		})
	})

	it('prevents duplicate category names within the same ownership scope and type', async () => {
		await seedSessionUsers()

		seedCategory({
			id: '10000000-0000-4000-8000-000000000020',
			userId: userId,
			type: 'expense',
			name: 'Bills',
			icon: 'receipt',
			color: '#6366f1',
			isDefault: false,
		})
		seedCategory({
			id: '10000000-0000-4000-8000-000000000021',
			userId: null,
			type: 'expense',
			name: 'Bills',
			icon: 'receipt-text',
			color: '#8b5cf6',
			isDefault: true,
		})

		const { cookie: userCookie } = await login('user@example.com', validPassword)
		const duplicateUserResponse = await app.inject({
			method: 'POST',
			url: '/categories',
			headers: {
				cookie: userCookie,
			},
			payload: {
				type: 'expense',
				name: 'bills',
				icon: 'file-text',
				color: '#334155',
			},
		})

		expect(duplicateUserResponse.statusCode).toBe(409)

		const { cookie: adminCookie } = await login('admin@example.com', validPassword)
		const duplicateAdminResponse = await app.inject({
			method: 'POST',
			url: '/categories',
			headers: {
				cookie: adminCookie,
			},
			payload: {
				type: 'expense',
				name: 'BILLS',
				icon: 'file-badge',
				color: '#1d4ed8',
			},
		})

		expect(duplicateAdminResponse.statusCode).toBe(409)
		expect(duplicateAdminResponse.json()).toEqual({
			statusCode: 409,
			error: 'ConflictError',
			message: 'Category name already in use for this type',
		})
	})

	it('allows updating and deleting only accessible categories', async () => {
		await seedSessionUsers()

		seedCategory({
			id: '10000000-0000-4000-8000-000000000030',
			userId,
			type: 'expense',
			name: 'Coffee',
			icon: 'coffee',
			color: '#92400e',
			isDefault: false,
		})
		seedCategory({
			id: '10000000-0000-4000-8000-000000000031',
			userId: null,
			type: 'expense',
			name: 'Groceries',
			icon: 'shopping-basket',
			color: '#10b981',
			isDefault: true,
		})

		const { cookie: userCookie } = await login('user@example.com', validPassword)
		const updateResponse = await app.inject({
			method: 'PATCH',
			url: '/categories/10000000-0000-4000-8000-000000000030',
			headers: {
				cookie: userCookie,
			},
			payload: {
				name: 'Coffee Shops',
				icon: 'cup-soda',
				color: '#a16207',
			},
		})

		expect(updateResponse.statusCode).toBe(200)
		expect(updateResponse.json()).toEqual(
			expect.objectContaining({
				id: '10000000-0000-4000-8000-000000000030',
				name: 'Coffee Shops',
				icon: 'cup-soda',
				color: '#a16207',
				isDefault: false,
				userId,
			}),
		)

		const forbiddenUpdateResponse = await app.inject({
			method: 'PATCH',
			url: '/categories/10000000-0000-4000-8000-000000000031',
			headers: {
				cookie: userCookie,
			},
			payload: {
				name: 'Should Fail',
			},
		})

		expect(forbiddenUpdateResponse.statusCode).toBe(404)

		const { cookie: adminCookie } = await login('admin@example.com', validPassword)
		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: '/categories/10000000-0000-4000-8000-000000000031',
			headers: {
				cookie: adminCookie,
			},
		})

		expect(deleteResponse.statusCode).toBe(200)
		expect(deleteResponse.json()).toEqual({
			message: 'Category deleted successfully',
		})

		const getResponse = await app.inject({
			method: 'GET',
			url: '/categories',
			headers: {
				cookie: adminCookie,
			},
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual([])
	})
})
