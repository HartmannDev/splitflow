import bcrypt from 'bcrypt'
import type { Password } from '../users/model.ts'

const passwordPepper = process.env.PASSWORD_PEPPER

const createHash = async (password: Password) => {
	const passwordSalt = await bcrypt.genSalt(10)
	const passwordHash = await bcrypt.hash(password + passwordPepper, passwordSalt)
	return { passwordHash, passwordSalt }
}

const verifyHash = async (password: Password, passwordHash: string) => {
	return await bcrypt.compare(password + passwordPepper, passwordHash)
}

export { createHash, verifyHash }
