import { describe, expect, it } from 'vitest'
import { buildHashValidator } from '../../src/modules/auth/hash-validator.ts'

describe('hash validator', () => {
	it('creates a password hash and salt', async () => {
		const { createHash } = buildHashValidator('test-pepper')

		const result = await createHash('secret123')

		expect(result.passwordSalt).toBeTypeOf('string')
		expect(result.passwordHash).toBeTypeOf('string')
		expect(result.passwordHash).not.toBe('secret123')
	})

	it('verifies a password hashed with the same pepper', async () => {
		const { createHash, verifyHash } = buildHashValidator('test-pepper')
		const { passwordHash } = await createHash('secret123')

		await expect(verifyHash('secret123', passwordHash)).resolves.toBe(true)
		await expect(verifyHash('wrong-password', passwordHash)).resolves.toBe(false)
	})

	it('does not verify when the pepper changes', async () => {
		const hashModule = buildHashValidator('pepper-a')
		const { passwordHash } = await hashModule.createHash('secret123')
		const verifyModule = buildHashValidator('pepper-b')

		await expect(verifyModule.verifyHash('secret123', passwordHash)).resolves.toBe(false)
	})
})
