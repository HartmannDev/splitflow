import { expect } from 'vitest'

export const getSessionCookie = (setCookieHeader: string | string[] | undefined) => {
	const cookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader

	expect(cookie).toBeDefined()
	return cookie!.split(';')[0]
}
