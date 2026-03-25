import { afterEach, describe, expect, it, vi } from 'vitest'

const loadHashValidator = async (passwordPepper: string) => {
	process.env.PASSWORD_PEPPER = passwordPepper
	vi.resetModules()
	return await import('../../src/modules/auth/hash-validator.ts')
}

afterEach(() => {
	delete process.env.PASSWORD_PEPPER
	vi.resetModules()
})

describe('hash validator', () => {
	it('creates a password hash and salt', async () => {
		const { createHash } = await loadHashValidator('test-pepper')

		const result = await createHash('secret123')

		expect(result.passwordSalt).toBeTypeOf('string')
		expect(result.passwordHash).toBeTypeOf('string')
		expect(result.passwordHash).not.toBe('secret123')
	})

	it('verifies a password hashed with the same pepper', async () => {
		const { createHash, verifyHash } = await loadHashValidator('test-pepper')
		const { passwordHash } = await createHash('secret123')

		await expect(verifyHash('secret123', passwordHash)).resolves.toBe(true)
		await expect(verifyHash('wrong-password', passwordHash)).resolves.toBe(false)
	})

	it('does not verify when the pepper changes', async () => {
		const hashModule = await loadHashValidator('pepper-a')
		const { passwordHash } = await hashModule.createHash('secret123')

		const verifyModule = await loadHashValidator('pepper-b')

		await expect(verifyModule.verifyHash('secret123', passwordHash)).resolves.toBe(false)
	})
})
