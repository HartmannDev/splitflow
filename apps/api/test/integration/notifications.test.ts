import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'
import { buildTestApp } from '../helpers/build-test-app.ts'
import { getSessionCookie } from '../helpers/cookies.ts'

import type { NotificationRow, UserRow } from '../helpers/fake-db.ts'

describe('notifications integration', () => {
	const passwordPepper = 'test-pepper'
	const validPassword = 'Secret123!'
	const userId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
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

	const seedNotification = (notification: NotificationRow) => {
		fakeDatabase.seedNotification(notification)
	}

	const login = async (email: string, password: string) => {
		const response = await app.inject({
			method: 'POST',
			url: '/login',
			payload: { email, password },
		})

		return {
			cookie: getSessionCookie(response.headers['set-cookie']),
		}
	}

	it('lists and updates notifications for the current user', async () => {
		const { createHash } = buildHashValidator(passwordPepper)
		const { passwordHash } = await createHash(validPassword)

		await seedUser({
			id: userId,
			role: 'user',
			name: 'Notify',
			lastname: 'User',
			email: 'notify@example.com',
			passwordHash,
			emailVerifiedAt: '2026-03-25T00:00:00.000Z',
		})

		seedNotification({
			id: '90000000-0000-4000-8000-000000000001',
			userId,
			type: 'share_invite',
			title: 'Invitation',
			message: 'You have a new invite',
		})

		const { cookie } = await login('notify@example.com', validPassword)
		const listResponse = await app.inject({
			method: 'GET',
			url: '/notifications',
			headers: { cookie },
		})

		expect(listResponse.statusCode).toBe(200)
		expect(listResponse.json()).toEqual([
			expect.objectContaining({
				id: '90000000-0000-4000-8000-000000000001',
				status: 'pending',
			}),
		])

		const readResponse = await app.inject({
			method: 'PATCH',
			url: '/notifications/90000000-0000-4000-8000-000000000001',
			headers: { cookie },
			payload: { status: 'read' },
		})

		expect(readResponse.statusCode).toBe(200)
		expect(readResponse.json()).toEqual(
			expect.objectContaining({
				status: 'read',
			}),
		)
	})
})
