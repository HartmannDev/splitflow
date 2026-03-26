import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { ContactRow, GroupMemberRow, GroupRow, UserRow } from '../helpers/fake-db.ts'

describe('groups integration', () => {
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

	const seedGroup = (group: GroupRow) => {
		fakeDatabase.seedGroup(group)
	}

	const seedGroupMember = (member: GroupMemberRow) => {
		fakeDatabase.seedGroupMember(member)
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

	it('creates groups with the owner automatically included as a member', async () => {
		await seedSessionUsers()
		seedContact({
			id: '40000000-0000-4000-8000-000000000001',
			userId,
			name: 'Alice',
			email: 'alice@example.com',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'POST',
			url: '/groups',
			headers: { cookie },
			payload: {
				name: 'Trip',
				contactIds: ['40000000-0000-4000-8000-000000000001'],
			},
		})

		expect(response.statusCode).toBe(201)

		const listResponse = await app.inject({
			method: 'GET',
			url: '/groups',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual([
			expect.objectContaining({
				name: 'Trip',
				ownerUserId: userId,
				previousGroupId: null,
				members: expect.arrayContaining([
					expect.objectContaining({
						memberUserId: userId,
						memberContactId: null,
					}),
					expect.objectContaining({
						memberUserId: null,
						memberContactId: '40000000-0000-4000-8000-000000000001',
					}),
				]),
			}),
		])
	})

	it('returns one owned group and can include deleted groups in listings', async () => {
		await seedSessionUsers()
		seedGroup({
			id: '40000000-0000-4000-8000-000000000010',
			ownerUserId: userId,
			name: 'Dinner',
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000010',
			groupId: '40000000-0000-4000-8000-000000000010',
			memberUserId: userId,
		})
		seedGroup({
			id: '40000000-0000-4000-8000-000000000011',
			ownerUserId: userId,
			name: 'Old Group',
			deletedAt: '2026-03-25T01:00:00.000Z',
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000011',
			groupId: '40000000-0000-4000-8000-000000000011',
			memberUserId: userId,
		})

		const { cookie } = await login('user@example.com', validPassword)

		const getResponse = await app.inject({
			method: 'GET',
			url: '/groups/40000000-0000-4000-8000-000000000010',
			headers: { cookie },
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual(
			expect.objectContaining({
				id: '40000000-0000-4000-8000-000000000010',
				name: 'Dinner',
			}),
		)

		const inclusiveResponse = await app.inject({
			method: 'GET',
			url: '/groups?includeDeleted=true',
			headers: { cookie },
		})

		expect(inclusiveResponse.statusCode).toBe(200)
		expect(inclusiveResponse.json()).toHaveLength(2)

		const membersResponse = await app.inject({
			method: 'GET',
			url: '/groups/40000000-0000-4000-8000-000000000010/members',
			headers: { cookie },
		})

		expect(membersResponse.statusCode).toBe(200)
		expect(membersResponse.json()).toEqual([
			expect.objectContaining({
				memberUserId: userId,
				memberContactId: null,
			}),
		])
	})

	it('updates only group metadata and creates a new version when membership changes', async () => {
		await seedSessionUsers()
		seedContact({
			id: '40000000-0000-4000-8000-000000000020',
			userId,
			name: 'Alice',
		})
		seedContact({
			id: '40000000-0000-4000-8000-000000000021',
			userId,
			name: 'Bob',
		})
		seedGroup({
			id: '40000000-0000-4000-8000-000000000022',
			ownerUserId: userId,
			name: 'Weekend',
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000022',
			groupId: '40000000-0000-4000-8000-000000000022',
			memberUserId: userId,
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000023',
			groupId: '40000000-0000-4000-8000-000000000022',
			memberContactId: '40000000-0000-4000-8000-000000000020',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const updateResponse = await app.inject({
			method: 'PATCH',
			url: '/groups/40000000-0000-4000-8000-000000000022',
			headers: { cookie },
			payload: {
				name: 'Weekend Crew',
			},
		})

		expect(updateResponse.statusCode).toBe(200)
		expect(updateResponse.json()).toEqual(
			expect.objectContaining({
				id: '40000000-0000-4000-8000-000000000022',
				name: 'Weekend Crew',
				previousGroupId: null,
			}),
		)

		const versionResponse = await app.inject({
			method: 'POST',
			url: '/groups/40000000-0000-4000-8000-000000000022/version',
			headers: { cookie },
			payload: {
				contactIds: ['40000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000021'],
			},
		})

		expect(versionResponse.statusCode).toBe(201)

		const listResponse = await app.inject({
			method: 'GET',
			url: '/groups',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: '40000000-0000-4000-8000-000000000022',
					name: 'Weekend Crew',
					previousGroupId: null,
				}),
				expect.objectContaining({
					previousGroupId: '40000000-0000-4000-8000-000000000022',
					name: 'Weekend Crew',
					members: expect.arrayContaining([
						expect.objectContaining({ memberUserId: userId, memberContactId: null }),
						expect.objectContaining({ memberContactId: '40000000-0000-4000-8000-000000000020' }),
						expect.objectContaining({ memberContactId: '40000000-0000-4000-8000-000000000021' }),
					]),
				}),
			]),
		)
	})

	it('rejects groups built from contacts that do not belong to the current user', async () => {
		await seedSessionUsers()
		seedContact({
			id: '40000000-0000-4000-8000-000000000030',
			userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			name: 'Other Owner Contact',
		})

		const { cookie } = await login('user@example.com', validPassword)
		const response = await app.inject({
			method: 'POST',
			url: '/groups',
			headers: { cookie },
			payload: {
				name: 'Invalid',
				contactIds: ['40000000-0000-4000-8000-000000000030'],
			},
		})

		expect(response.statusCode).toBe(400)
		expect(response.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'All contacts must belong to the current user',
		})
	})

	it('adds and removes contact members by creating new group versions', async () => {
		await seedSessionUsers()
		seedContact({
			id: '40000000-0000-4000-8000-000000000050',
			userId,
			name: 'Alice',
		})
		seedContact({
			id: '40000000-0000-4000-8000-000000000051',
			userId,
			name: 'Bob',
		})
		seedGroup({
			id: '40000000-0000-4000-8000-000000000052',
			ownerUserId: userId,
			name: 'Core Group',
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000052',
			groupId: '40000000-0000-4000-8000-000000000052',
			memberUserId: userId,
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000053',
			groupId: '40000000-0000-4000-8000-000000000052',
			memberContactId: '40000000-0000-4000-8000-000000000050',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const addResponse = await app.inject({
			method: 'POST',
			url: '/groups/40000000-0000-4000-8000-000000000052/members',
			headers: { cookie },
			payload: {
				contactId: '40000000-0000-4000-8000-000000000051',
			},
		})

		expect(addResponse.statusCode).toBe(201)

		const groupsAfterAdd = await app.inject({
			method: 'GET',
			url: '/groups',
			headers: { cookie },
		})

		const createdVersion = groupsAfterAdd
			.json()
			.find((group: { previousGroupId: string | null }) => group.previousGroupId === '40000000-0000-4000-8000-000000000052')

		expect(createdVersion).toBeDefined()
		expect(createdVersion.members).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ memberUserId: userId, memberContactId: null }),
				expect.objectContaining({ memberContactId: '40000000-0000-4000-8000-000000000050' }),
				expect.objectContaining({ memberContactId: '40000000-0000-4000-8000-000000000051' }),
			]),
		)

		const removableMember = createdVersion.members.find(
			(member: { memberContactId: string | null }) => member.memberContactId === '40000000-0000-4000-8000-000000000050',
		)

		const removeResponse = await app.inject({
			method: 'DELETE',
			url: `/groups/${createdVersion.id}/members/${removableMember.id}`,
			headers: { cookie },
		})

		expect(removeResponse.statusCode).toBe(201)

		const groupsAfterRemove = await app.inject({
			method: 'GET',
			url: '/groups',
			headers: { cookie },
		})

		expect(groupsAfterRemove.statusCode).toBe(200)
		expect(groupsAfterRemove.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					previousGroupId: createdVersion.id,
					members: expect.arrayContaining([
						expect.objectContaining({ memberUserId: userId, memberContactId: null }),
						expect.objectContaining({ memberContactId: '40000000-0000-4000-8000-000000000051' }),
					]),
				}),
			]),
		)
	})

	it('rejects invalid nested member mutations', async () => {
		await seedSessionUsers()
		seedContact({
			id: '40000000-0000-4000-8000-000000000060',
			userId,
			name: 'Alice',
		})
		seedGroup({
			id: '40000000-0000-4000-8000-000000000061',
			ownerUserId: userId,
			name: 'Rules Group',
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000061',
			groupId: '40000000-0000-4000-8000-000000000061',
			memberUserId: userId,
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000062',
			groupId: '40000000-0000-4000-8000-000000000061',
			memberContactId: '40000000-0000-4000-8000-000000000060',
		})

		const { cookie } = await login('user@example.com', validPassword)

		const duplicateAddResponse = await app.inject({
			method: 'POST',
			url: '/groups/40000000-0000-4000-8000-000000000061/members',
			headers: { cookie },
			payload: {
				contactId: '40000000-0000-4000-8000-000000000060',
			},
		})

		expect(duplicateAddResponse.statusCode).toBe(400)
		expect(duplicateAddResponse.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Contact is already a group member',
		})

		const ownerRemoveResponse = await app.inject({
			method: 'DELETE',
			url: '/groups/40000000-0000-4000-8000-000000000061/members/41000000-0000-4000-8000-000000000061',
			headers: { cookie },
		})

		expect(ownerRemoveResponse.statusCode).toBe(400)
		expect(ownerRemoveResponse.json()).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Owner membership cannot be removed',
		})
	})

	it('soft deletes owned groups and blocks admin access', async () => {
		await seedSessionUsers()
		seedGroup({
			id: '40000000-0000-4000-8000-000000000040',
			ownerUserId: userId,
			name: 'Delete Me',
		})
		seedGroupMember({
			id: '41000000-0000-4000-8000-000000000040',
			groupId: '40000000-0000-4000-8000-000000000040',
			memberUserId: userId,
		})

		const { cookie } = await login('user@example.com', validPassword)
		const deleteResponse = await app.inject({
			method: 'DELETE',
			url: '/groups/40000000-0000-4000-8000-000000000040',
			headers: { cookie },
		})

		expect(deleteResponse.statusCode).toBe(200)

		const getResponse = await app.inject({
			method: 'GET',
			url: '/groups',
			headers: { cookie },
		})

		expect(getResponse.statusCode).toBe(200)
		expect(getResponse.json()).toEqual([])

		const { cookie: adminCookie } = await login('admin@example.com', validPassword)
		const adminResponse = await app.inject({
			method: 'GET',
			url: '/groups',
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
