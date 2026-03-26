import { createHash as createDigest, randomBytes } from 'node:crypto'

import bcrypt from 'bcrypt'

export const buildHashValidator = (passwordPepper: string) => {
	const createHash = async (text: string) => {
		const passwordSalt = await bcrypt.genSalt(10)
		const passwordHash = await bcrypt.hash(text + passwordPepper, passwordSalt)
		return { passwordHash, passwordSalt }
	}

	const hashToken = (token: string) => createDigest('sha256').update(token + passwordPepper).digest('hex')

	const createRandomToken = async () => {
		const token = randomBytes(32).toString('hex')
		const tokenHash = hashToken(token)
		return { token, tokenHash }
	}

	const verifyHash = async (text: string, hash: string) => {
		return await bcrypt.compare(text + passwordPepper, hash)
	}

	return {
		createHash,
		verifyHash,
		hashToken,
		createRandomToken,
	}
}
