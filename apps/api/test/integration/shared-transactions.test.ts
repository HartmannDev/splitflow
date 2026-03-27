import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type {
	AccountRow,
	CategoryRow,
	ContactRow,
	GroupMemberRow,
	GroupRow,
	UserRow,
} from '../helpers/fake-db.ts'

describe('shared transactions integration', () => {
	const passwordPepper = 'test-pepper'
	const validPassword = 'Secret123!'
	const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
	const participantId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
	const adminId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
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
	const seedContact = (contact: ContactRow) => fakeDatabase.seedContact(contact)
	const seedGroup = (group: GroupRow) => fakeDatabase.seedGroup(group)
	const seedGroupMember = (member: GroupMemberRow) => fakeDatabase.seedGroupMember(member)

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
			id: ownerId,
			role: 'user',
			name: 'Owner',
			lastname: 'User',
			email: 'owner@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: participantId,
			role: 'user',
			name: 'Participant',
			lastname: 'User',
			email: 'participant@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		await seedUser({
			id: adminId,
			role: 'admin',
			name: 'Admin',
			lastname: 'User',
			email: 'admin@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})
	}

	const seedSharedDependencies = () => {
		seedAccount({
			id: '80000000-0000-4000-8000-000000000000',
			userId: ownerId,
			currencyCode: 'USD',
			name: 'Owner Checking',
			icon: 'wallet',
			color: '#0f766e',
			initialValue: '0',
		})
		seedAccount({
			id: '80000000-0000-4000-8000-000000000001',
			userId: participantId,
			currencyCode: 'USD',
			name: 'Participant Checking',
			icon: 'wallet',
			color: '#2563eb',
			initialValue: '0',
		})
		seedCategory({
			id: '80000000-0000-4000-8000-000000000010',
			userId: null,
			type: 'expense',
			name: 'Shared Expense',
			icon: 'users',
			color: '#16a34a',
			isDefault: true,
		})
		seedContact({
			id: '80000000-0000-4000-8000-000000000020',
			userId: ownerId,
			name: 'Linked Participant',
			email: 'participant@example.com',
			linkedUserId: participantId,
		})
		seedContact({
			id: '80000000-0000-4000-8000-000000000021',
			userId: ownerId,
			name: 'Offline Friend',
			email: 'offline@example.com',
		})
		seedGroup({
			id: '80000000-0000-4000-8000-000000000030',
			ownerUserId: ownerId,
			name: 'Trip',
		})
		seedGroupMember({
			id: '80000000-0000-4000-8000-000000000031',
			groupId: '80000000-0000-4000-8000-000000000030',
			memberUserId: ownerId,
		})
		seedGroupMember({
			id: '80000000-0000-4000-8000-000000000032',
			groupId: '80000000-0000-4000-8000-000000000030',
			memberContactId: '80000000-0000-4000-8000-000000000020',
		})
		seedGroupMember({
			id: '80000000-0000-4000-8000-000000000033',
			groupId: '80000000-0000-4000-8000-000000000030',
			memberContactId: '80000000-0000-4000-8000-000000000021',
		})
	}

	it('creates a shared transaction, notifies linked users, and supports accept/update/payment flows', async () => {
		await seedSessionUsers()
		seedSharedDependencies()

		const { cookie: ownerCookie } = await login('owner@example.com', validPassword)
		const createResponse = await app.inject({
			method: 'POST',
			url: '/shared-transactions',
			headers: { cookie: ownerCookie },
			payload: {
				groupId: '80000000-0000-4000-8000-000000000030',
				type: 'expense',
				ownerAccountId: '80000000-0000-4000-8000-000000000000',
				ownerCategoryId: '80000000-0000-4000-8000-000000000010',
				totalAmount: '100',
				description: ' Weekend house ',
				notes: ' beach ',
				transactionDate: '2026-03-27T10:00:00.000Z',
				splitMethod: 'equal',
			},
		})

		expect(createResponse.statusCode).toBe(201)
		const sharedTransactionId = createResponse.json().sharedTransactionId as string

		const ownerListResponse = await app.inject({
			method: 'GET',
			url: '/shared-transactions',
			headers: { cookie: ownerCookie },
		})

		expect(ownerListResponse.statusCode).toBe(200)
		expect(ownerListResponse.json()).toEqual([
			expect.objectContaining({
				id: sharedTransactionId,
				description: 'Weekend house',
				status: 'partially_accepted',
				participants: expect.arrayContaining([
					expect.objectContaining({ participantUserId: ownerId, amount: '33.333334', approvalStatus: 'accepted' }),
					expect.objectContaining({ participantUserId: participantId, amount: '33.333333', approvalStatus: 'pending' }),
					expect.objectContaining({ participantContactId: '80000000-0000-4000-8000-000000000021', amount: '33.333333', approvalStatus: 'accepted' }),
				]),
			}),
		])

		const ownerTransactionsResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie: ownerCookie },
		})

		expect(ownerTransactionsResponse.statusCode).toBe(200)
		expect(ownerTransactionsResponse.json()).toEqual([
			expect.objectContaining({
				type: 'expense',
				status: 'done',
				description: 'Weekend house',
				accountId: '80000000-0000-4000-8000-000000000000',
				categoryId: '80000000-0000-4000-8000-000000000010',
				isFromShared: true,
			}),
		])

		const { cookie: participantCookie } = await login('participant@example.com', validPassword)
		const participantNotificationsResponse = await app.inject({
			method: 'GET',
			url: '/notifications',
			headers: { cookie: participantCookie },
		})

		expect(participantNotificationsResponse.statusCode).toBe(200)
		expect(participantNotificationsResponse.json()).toEqual([
			expect.objectContaining({
				type: 'share_invite',
				relatedSharedTransactionId: sharedTransactionId,
			}),
		])

		const participantSharedResponse = await app.inject({
			method: 'GET',
			url: `/shared-transactions/${sharedTransactionId}`,
			headers: { cookie: participantCookie },
		})

		expect(participantSharedResponse.statusCode).toBe(200)
		const participantRecord = participantSharedResponse
			.json()
			.participants.find((participant: { participantUserId: string | null }) => participant.participantUserId === participantId)

		const acceptResponse = await app.inject({
			method: 'POST',
			url: `/shared-transactions/${sharedTransactionId}/participants/${participantRecord.id}/accept`,
			headers: { cookie: participantCookie },
			payload: {
				accountId: '80000000-0000-4000-8000-000000000001',
				categoryId: '80000000-0000-4000-8000-000000000010',
			},
		})

		expect(acceptResponse.statusCode).toBe(200)
		expect(acceptResponse.json()).toEqual(
			expect.objectContaining({
				approvalStatus: 'accepted',
				userTransactionId: expect.any(String),
			}),
		)

		const missingCategoryAcceptResponse = await app.inject({
			method: 'POST',
			url: `/shared-transactions/${sharedTransactionId}/participants/${participantRecord.id}/accept`,
			headers: { cookie: participantCookie },
			payload: {
				accountId: '80000000-0000-4000-8000-000000000001',
			},
		})

		expect(missingCategoryAcceptResponse.statusCode).toBe(400)

		const participantTransactionsResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie: participantCookie },
		})

		expect(participantTransactionsResponse.statusCode).toBe(200)
		expect(participantTransactionsResponse.json()).toEqual([
			expect.objectContaining({
				type: 'expense',
				status: 'pending',
				description: 'Weekend house',
				isFromShared: true,
				categoryId: '80000000-0000-4000-8000-000000000010',
			}),
		])

		const updateResponse = await app.inject({
			method: 'PATCH',
			url: `/shared-transactions/${sharedTransactionId}`,
			headers: { cookie: ownerCookie },
			payload: {
				description: 'Weekend house updated',
				totalAmount: '120',
				splitMethod: 'equal',
			},
		})

		expect(updateResponse.statusCode).toBe(200)
		expect(updateResponse.json()).toEqual(
			expect.objectContaining({
				currentEditVersion: 2,
				description: 'Weekend house updated',
				status: 'pending',
				participants: expect.arrayContaining([
					expect.objectContaining({ participantUserId: participantId, approvalStatus: 'pending' }),
				]),
			}),
		)

		const ownerTransactionsAfterUpdateResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie: ownerCookie },
		})

		expect(ownerTransactionsAfterUpdateResponse.statusCode).toBe(200)
		expect(ownerTransactionsAfterUpdateResponse.json()).toEqual([
			expect.objectContaining({
				type: 'expense',
				status: 'done',
				description: 'Weekend house updated',
				accountId: '80000000-0000-4000-8000-000000000000',
				categoryId: '80000000-0000-4000-8000-000000000010',
				isFromShared: true,
			}),
		])

		const participantTransactionsAfterUpdateResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie: participantCookie },
		})

		expect(participantTransactionsAfterUpdateResponse.statusCode).toBe(200)
		expect(participantTransactionsAfterUpdateResponse.json()).toEqual([
			expect.objectContaining({
				status: 'pending',
				description: 'Weekend house',
				isFromShared: true,
			}),
		])

		const participantNotificationsAfterUpdateResponse = await app.inject({
			method: 'GET',
			url: '/notifications?includeResolved=true',
			headers: { cookie: participantCookie },
		})

		expect(participantNotificationsAfterUpdateResponse.statusCode).toBe(200)
		expect(participantNotificationsAfterUpdateResponse.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'share_invite', status: 'superseded' }),
				expect.objectContaining({ type: 'share_updated', status: 'pending' }),
			]),
		)

		const participantUpdatedSharedResponse = await app.inject({
			method: 'GET',
			url: `/shared-transactions/${sharedTransactionId}`,
			headers: { cookie: participantCookie },
		})
		const updatedParticipantRecord = participantUpdatedSharedResponse
			.json()
			.participants.find((participant: { participantUserId: string | null }) => participant.participantUserId === participantId)
		const contactParticipantRecord = updateResponse
			.json()
			.participants.find((participant: { participantContactId: string | null }) => participant.participantContactId === '80000000-0000-4000-8000-000000000021')

		const acceptUpdatedResponse = await app.inject({
			method: 'POST',
			url: `/shared-transactions/${sharedTransactionId}/participants/${updatedParticipantRecord.id}/accept`,
			headers: { cookie: participantCookie },
			payload: {
				accountId: '80000000-0000-4000-8000-000000000001',
				categoryId: '80000000-0000-4000-8000-000000000010',
			},
		})

		expect(acceptUpdatedResponse.statusCode).toBe(200)

		const markPaidResponse = await app.inject({
			method: 'POST',
			url: `/shared-transactions/${sharedTransactionId}/participants/${updatedParticipantRecord.id}/mark-paid`,
			headers: { cookie: participantCookie },
		})

		expect(markPaidResponse.statusCode).toBe(200)
		expect(markPaidResponse.json()).toEqual(expect.objectContaining({ paymentStatus: 'marked_paid' }))

		const ownerNotificationsResponse = await app.inject({
			method: 'GET',
			url: '/notifications',
			headers: { cookie: ownerCookie },
		})

		expect(ownerNotificationsResponse.statusCode).toBe(200)
		expect(ownerNotificationsResponse.json()).toEqual([
			expect.objectContaining({
				type: 'payment_confirm_request',
				relatedSharedTransactionId: sharedTransactionId,
			}),
		])

		const confirmPaidResponse = await app.inject({
			method: 'POST',
			url: `/shared-transactions/${sharedTransactionId}/participants/${updatedParticipantRecord.id}/confirm-paid`,
			headers: { cookie: ownerCookie },
		})

		expect(confirmPaidResponse.statusCode).toBe(200)
		expect(confirmPaidResponse.json()).toEqual(expect.objectContaining({ paymentStatus: 'confirmed_paid' }))

		const contactMarkPaidResponse = await app.inject({
			method: 'POST',
			url: `/shared-transactions/${sharedTransactionId}/participants/${contactParticipantRecord.id}/mark-paid`,
			headers: { cookie: ownerCookie },
		})

		expect(contactMarkPaidResponse.statusCode).toBe(200)
		expect(contactMarkPaidResponse.json()).toEqual(expect.objectContaining({ paymentStatus: 'confirmed_paid' }))

		const participantNotificationsAfterConfirmResponse = await app.inject({
			method: 'GET',
			url: '/notifications?includeResolved=true',
			headers: { cookie: participantCookie },
		})

		expect(participantNotificationsAfterConfirmResponse.statusCode).toBe(200)
		expect(participantNotificationsAfterConfirmResponse.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'share_invite' }),
				expect.objectContaining({ type: 'payment_confirmed' }),
			]),
		)

		const participantTransactionsAfterConfirmResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie: participantCookie },
		})

		expect(participantTransactionsAfterConfirmResponse.statusCode).toBe(200)
		expect(participantTransactionsAfterConfirmResponse.json()).toEqual([
			expect.objectContaining({
				status: 'done',
				description: 'Weekend house updated',
				isFromShared: true,
			}),
		])
	})

	it('supports shared income transactions and creates income ledger rows on acceptance', async () => {
		await seedSessionUsers()
		seedSharedDependencies()

		seedCategory({
			id: '80000000-0000-4000-8000-000000000011',
			userId: null,
			type: 'income',
			name: 'Shared Income',
			icon: 'coins',
			color: '#f59e0b',
			isDefault: true,
		})

		const { cookie: ownerCookie } = await login('owner@example.com', validPassword)
		const createResponse = await app.inject({
			method: 'POST',
			url: '/shared-transactions',
			headers: { cookie: ownerCookie },
			payload: {
				groupId: '80000000-0000-4000-8000-000000000030',
				type: 'income',
				ownerAccountId: '80000000-0000-4000-8000-000000000000',
				ownerCategoryId: '80000000-0000-4000-8000-000000000011',
				totalAmount: '90',
				description: ' Cashback ',
				transactionDate: '2026-03-27T10:00:00.000Z',
				splitMethod: 'equal',
			},
		})

		expect(createResponse.statusCode).toBe(201)
		const sharedTransactionId = createResponse.json().sharedTransactionId as string

		const ownerTransactionsResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie: ownerCookie },
		})

		expect(ownerTransactionsResponse.statusCode).toBe(200)
		expect(ownerTransactionsResponse.json()).toEqual([
			expect.objectContaining({
				type: 'income',
				status: 'done',
				description: 'Cashback',
				accountId: '80000000-0000-4000-8000-000000000000',
				categoryId: '80000000-0000-4000-8000-000000000011',
				isFromShared: true,
			}),
		])

		const { cookie: participantCookie } = await login('participant@example.com', validPassword)
		const participantSharedResponse = await app.inject({
			method: 'GET',
			url: `/shared-transactions/${sharedTransactionId}`,
			headers: { cookie: participantCookie },
		})

		expect(participantSharedResponse.statusCode).toBe(200)
		const participantRecord = participantSharedResponse
			.json()
			.participants.find((participant: { participantUserId: string | null }) => participant.participantUserId === participantId)

		const acceptResponse = await app.inject({
			method: 'POST',
			url: `/shared-transactions/${sharedTransactionId}/participants/${participantRecord.id}/accept`,
			headers: { cookie: participantCookie },
			payload: {
				accountId: '80000000-0000-4000-8000-000000000001',
				categoryId: '80000000-0000-4000-8000-000000000011',
			},
		})

		expect(acceptResponse.statusCode).toBe(200)

		const participantTransactionsResponse = await app.inject({
			method: 'GET',
			url: '/transactions',
			headers: { cookie: participantCookie },
		})

		expect(participantTransactionsResponse.statusCode).toBe(200)
		expect(participantTransactionsResponse.json()).toEqual([
			expect.objectContaining({
				type: 'income',
				status: 'pending',
				description: 'Cashback',
				categoryId: '80000000-0000-4000-8000-000000000011',
				isFromShared: true,
			}),
		])
	})
})
