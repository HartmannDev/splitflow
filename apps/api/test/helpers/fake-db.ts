import type { UserType } from '../../src/modules/users/model.ts'

type SessionRow = {
	sess: string
	expiresAt: Date
}

type VerificationTokenRow = {
	userId: string
	token: string
	expiresAt: Date
}

type UserRow = Pick<UserType, 'id' | 'role' | 'name' | 'lastname' | 'email'> & {
	passwordHash: string
	emailVerifiedAt?: string | null
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
	isActive?: boolean
}

class FakePool {
	private readonly sessions = new Map<string, SessionRow>()

	async query(sql: string, params: unknown[] = []) {
		if (sql.includes('INSERT INTO sessions')) {
			const [sessionId, session, expiresAt] = params as [string, string, Date]

			this.sessions.set(sessionId, {
				sess: session,
				expiresAt,
			})

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('expires_at as "expiresAt"')) {
			const [sessionId] = params as [string]
			const session = this.sessions.get(sessionId)

			if (!session) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [
					{
						sess: JSON.parse(session.sess),
						expiresAt: session.expiresAt,
					},
				],
			}
		}

		if (sql.includes('DELETE FROM sessions')) {
			const [sessionId] = params as [string]
			const deleted = this.sessions.delete(sessionId)

			return { rowCount: deleted ? 1 : 0, rows: [] }
		}

		throw new Error(`Unsupported session query: ${sql}`)
	}

	async connect() {
		return {
			query: this.query.bind(this),
			release() {},
		}
	}

	async end() {
		this.sessions.clear()
	}
}

export class FakeDatabase {
	public readonly pool = new FakePool()
	private readonly users = new Map<string, UserRow>()
	private readonly verificationTokens = new Map<string, VerificationTokenRow>()

	private buildUserResponse(user: UserRow) {
		return {
			id: user.id,
			role: user.role,
			name: user.name,
			lastname: user.lastname,
			email: user.email,
			isActive: user.isActive,
			emailVerifiedAt: user.emailVerifiedAt,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			deletedAt: user.deletedAt,
		}
	}

	private normalizeSeedUser(user: UserRow): UserRow {
		const timestamp = new Date().toISOString()

		return {
			...user,
			email: user.email.toLowerCase(),
			createdAt: user.createdAt ?? timestamp,
			updatedAt: user.updatedAt ?? timestamp,
			emailVerifiedAt: user.emailVerifiedAt ?? null,
			deletedAt: user.deletedAt ?? null,
			isActive: user.isActive ?? true,
		}
	}

	async query(sql: string, params?: unknown[]) {
		const queryParams = params ?? []

		if (sql.includes('password_hash as "passwordHash"') && sql.includes('email_verified_at as "emailVerifiedAt"')) {
			const [email] = queryParams as [string]
			const user = [...this.users.values()].find(
				(candidate) =>
					candidate.email.toLowerCase() === email.toLowerCase() && candidate.deletedAt === null && candidate.isActive,
			)

			return {
				rowCount: user ? 1 : 0,
				rows: user
					? [
							{
								id: user.id,
								email: user.email,
								passwordHash: user.passwordHash,
								role: user.role,
								emailVerifiedAt: user.emailVerifiedAt,
							},
						]
					: [],
			}
		}

		if (sql.includes('INSERT INTO users')) {
			const isManagedCreate = queryParams.length === 7
			const [
				id,
				roleOrName,
				nameOrLastname,
				lastnameOrEmail,
				emailOrPasswordHash,
				passwordHashOrEmailVerifiedAt,
				emailVerifiedAt,
			] = queryParams as [string, string, string, string, string, string, string | null]

			const role = isManagedCreate ? roleOrName : 'user'
			const name = isManagedCreate ? nameOrLastname : roleOrName
			const lastname = isManagedCreate ? lastnameOrEmail : nameOrLastname
			const email = isManagedCreate ? emailOrPasswordHash : lastnameOrEmail
			const passwordHash = isManagedCreate ? passwordHashOrEmailVerifiedAt : (emailOrPasswordHash as string)
			const verifiedAt = isManagedCreate ? emailVerifiedAt : (passwordHashOrEmailVerifiedAt as string | null)

			const emailExists = [...this.users.values()].some((user) => user.email.toLowerCase() === email.toLowerCase())

			if (emailExists) {
				throw { code: '23505' }
			}

			const timestamp = new Date().toISOString()
			this.users.set(id, {
				id,
				role: role as UserRow['role'],
				name,
				lastname,
				email: email.toLowerCase(),
				passwordHash,
				emailVerifiedAt: verifiedAt,
				createdAt: timestamp,
				updatedAt: timestamp,
				deletedAt: null,
				isActive: true,
			})

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('INSERT INTO verification_tokens')) {
			const [userId, token] = queryParams as [string, string, string]
			const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

			this.verificationTokens.set(token, {
				userId,
				token,
				expiresAt,
			})

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('FROM verification_tokens') && sql.includes('WHERE token = $1')) {
			const [token] = queryParams as [string]
			const verificationToken = this.verificationTokens.get(token)

			if (!verificationToken || verificationToken.expiresAt <= new Date()) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [
					{
						user_id: verificationToken.userId,
					},
				],
			}
		}

		if (sql.includes('FROM users') && sql.includes('WHERE id = $1') && sql.includes('deleted_at IS NULL')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('FROM users') && sql.includes('WHERE id = $1') && !sql.includes('deleted_at IS NULL')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('SELECT id') && sql.includes('FROM users') && sql.includes('WHERE lower(email) = lower($1)')) {
			const [email] = queryParams as [string]
			const user = [...this.users.values()].find(
				(candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.deletedAt === null,
			)

			return {
				rowCount: user ? 1 : 0,
				rows: user ? [{ id: user.id }] : [],
			}
		}

		if (
			sql.includes('FROM users') &&
			sql.includes('WHERE deleted_at IS NULL') &&
			sql.includes('ORDER BY created_at DESC')
		) {
			const rows = [...this.users.values()]
				.filter((user) => user.deletedAt === null)
				.sort((left, right) => right.createdAt!.localeCompare(left.createdAt!))
				.map((user) => this.buildUserResponse(user))

			return {
				rowCount: rows.length,
				rows,
			}
		}

		if (
			sql.includes('FROM users') &&
			sql.includes('ORDER BY created_at DESC') &&
			!sql.includes('WHERE deleted_at IS NULL')
		) {
			const rows = [...this.users.values()]
				.sort((left, right) => right.createdAt!.localeCompare(left.createdAt!))
				.map((user) => this.buildUserResponse(user))

			return {
				rowCount: rows.length,
				rows,
			}
		}

		if (sql.includes('UPDATE users') && sql.includes('SET name = $2') && sql.includes('RETURNING')) {
			const [id, name, lastname, email, emailVerifiedAt] = queryParams as [
				string,
				string,
				string,
				string,
				string | null,
			]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const emailExists = [...this.users.values()].some(
				(candidate) =>
					candidate.id !== id && candidate.deletedAt === null && candidate.email.toLowerCase() === email.toLowerCase(),
			)

			if (emailExists) {
				throw { code: '23505' }
			}

			user.name = name
			user.lastname = lastname
			user.email = email.toLowerCase()
			user.emailVerifiedAt = emailVerifiedAt
			user.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('UPDATE users') && sql.includes('SET password_hash = $2')) {
			const [id, passwordHash] = queryParams as [string, string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			user.passwordHash = passwordHash
			user.updatedAt = new Date().toISOString()

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE users') && sql.includes('SET password_hash = $1')) {
			const [passwordHash, id] = queryParams as [string, string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			user.passwordHash = passwordHash
			user.updatedAt = new Date().toISOString()

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE users') && sql.includes('SET email_verified_at = NOW()')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user) {
				return { rowCount: 0, rows: [] }
			}

			user.emailVerifiedAt = new Date().toISOString()
			user.updatedAt = new Date().toISOString()

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE users') && sql.includes('SET role = $2') && sql.includes('is_active = $3')) {
			const [id, role, isActive] = queryParams as [string, UserRow['role'], boolean]
			const user = this.users.get(id)

			if (!user) {
				return { rowCount: 0, rows: [] }
			}

			user.role = role
			user.isActive = isActive
			user.deletedAt = isActive ? null : (user.deletedAt ?? new Date().toISOString())
			user.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('UPDATE users') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			user.deletedAt = timestamp
			user.updatedAt = timestamp
			user.isActive = false

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('DELETE FROM verification_tokens') && sql.includes('WHERE user_id = $1')) {
			const [userId] = queryParams as [string]
			let deletedCount = 0

			for (const [token, verificationToken] of this.verificationTokens.entries()) {
				if (verificationToken.userId === userId) {
					this.verificationTokens.delete(token)
					deletedCount += 1
				}
			}

			return { rowCount: deletedCount, rows: [] }
		}

		if (sql.includes('DELETE FROM verification_tokens') && sql.includes('WHERE token = $1')) {
			const [token] = queryParams as [string]
			const deleted = this.verificationTokens.delete(token)

			return { rowCount: deleted ? 1 : 0, rows: [] }
		}

		throw new Error(`Unsupported database query: ${sql}`)
	}

	async transaction<T>(callback: (db: Pick<FakeDatabase, 'query'>) => Promise<T>) {
		return await callback({
			query: this.query.bind(this),
		})
	}

	async closePool() {
		await this.pool.end()
	}

	async testConnection() {
		return
	}

	seedUser(user: UserRow) {
		this.users.set(user.id, this.normalizeSeedUser(user))
	}
}

export type { UserRow }
