import bcrypt from 'bcrypt'
import type { Password } from '../users/model.ts'

export const buildHashValidator = (passwordPepper: string) => {
	const createHash = async (password: Password) => {
		const passwordSalt = await bcrypt.genSalt(10)
		const passwordHash = await bcrypt.hash(password + passwordPepper, passwordSalt)
		return { passwordHash, passwordSalt }
	}

	const verifyHash = async (password: Password, passwordHash: string) => {
		return await bcrypt.compare(password + passwordPepper, passwordHash)
	}

	return {
		createHash,
		verifyHash,
	}
}
