import type { User } from '../../src/modules/users/model.ts'

type SessionRow = {
	sess: string
	expires_at: Date
}

type UserRow = Pick<User, 'id' | 'role' | 'name' | 'lastname' | 'email'> & {
	password_hash: string
	email_verified_at?: string | null
	created_at?: string
	updated_at?: string
	deleted_at?: string | null
	is_active?: boolean
}

class FakePool {
	private readonly sessions = new Map<string, SessionRow>()

	async query(sql: string, params: unknown[] = []) {
		if (sql.includes('INSERT INTO sessions')) {
			const [sessionId, session, expiresAt] = params as [string, string, Date]

			this.sessions.set(sessionId, {
				sess: session,
				expires_at: expiresAt,
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
						expiresAt: session.expires_at,
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

	private buildUserResponse(user: UserRow) {
		return {
			id: user.id,
			role: user.role,
			name: user.name,
			lastname: user.lastname,
			email: user.email,
			isActive: user.is_active,
			emailVerifiedAt: user.email_verified_at,
			createdAt: user.created_at,
			updatedAt: user.updated_at,
			deletedAt: user.deleted_at,
		}
	}

	private normalizeSeedUser(user: UserRow): UserRow {
		const timestamp = new Date().toISOString()

		return {
			...user,
			email: user.email.toLowerCase(),
			created_at: user.created_at ?? timestamp,
			updated_at: user.updated_at ?? timestamp,
			email_verified_at: user.email_verified_at ?? null,
			deleted_at: user.deleted_at ?? null,
			is_active: user.is_active ?? true,
		}
	}

	async query(sql: string, params?: any[]) {
		const queryParams = params ?? []

		if (sql.includes('password_hash as "passwordHash"') && sql.includes('email_verified_at as "emailVerifiedAt"')) {
			const [email] = queryParams as [string]
			const user = [...this.users.values()].find(
				(candidate) =>
					candidate.email.toLowerCase() === email.toLowerCase() && candidate.deleted_at === null && candidate.is_active,
			)

			return {
				rowCount: user ? 1 : 0,
				rows: user
					? [
							{
								id: user.id,
								email: user.email,
								passwordHash: user.password_hash,
								role: user.role,
								emailVerifiedAt: user.email_verified_at,
							},
						]
					: [],
			}
		}

		if (sql.includes('INSERT INTO users')) {
			const isManagedCreate = queryParams.length === 7
			const [id, roleOrName, nameOrLastname, lastnameOrEmail, emailOrPasswordHash, passwordHashOrEmailVerifiedAt, emailVerifiedAt] =
				queryParams as [string, string, string, string, string, string, string | null]

			const role = isManagedCreate ? roleOrName : 'user'
			const name = isManagedCreate ? nameOrLastname : roleOrName
			const lastname = isManagedCreate ? lastnameOrEmail : nameOrLastname
			const email = isManagedCreate ? emailOrPasswordHash : lastnameOrEmail
			const passwordHash = isManagedCreate
				? passwordHashOrEmailVerifiedAt
				: (emailOrPasswordHash as string)
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
				password_hash: passwordHash,
				email_verified_at: verifiedAt,
				created_at: timestamp,
				updated_at: timestamp,
				deleted_at: null,
				is_active: true,
			})

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('FROM users') && sql.includes('WHERE id = $1') && sql.includes('deleted_at IS NULL')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user || user.deleted_at !== null) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('FROM users') && sql.includes('WHERE deleted_at IS NULL') && sql.includes('ORDER BY created_at DESC')) {
			const rows = [...this.users.values()]
				.filter((user) => user.deleted_at === null)
				.sort((left, right) => right.created_at.localeCompare(left.created_at))
				.map((user) => this.buildUserResponse(user))

			return {
				rowCount: rows.length,
				rows,
			}
		}

		if (sql.includes('FROM users') && sql.includes('ORDER BY created_at DESC') && !sql.includes('WHERE deleted_at IS NULL')) {
			const rows = [...this.users.values()]
				.sort((left, right) => right.created_at.localeCompare(left.created_at))
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

			if (!user || user.deleted_at !== null) {
				return { rowCount: 0, rows: [] }
			}

			const emailExists = [...this.users.values()].some(
				(candidate) =>
					candidate.id !== id &&
					candidate.deleted_at === null &&
					candidate.email.toLowerCase() === email.toLowerCase(),
			)

			if (emailExists) {
				throw { code: '23505' }
			}

			user.name = name
			user.lastname = lastname
			user.email = email.toLowerCase()
			user.email_verified_at = emailVerifiedAt
			user.updated_at = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('UPDATE users') && sql.includes('SET password_hash = $2')) {
			const [id, passwordHash] = queryParams as [string, string]
			const user = this.users.get(id)

			if (!user || user.deleted_at !== null) {
				return { rowCount: 0, rows: [] }
			}

			user.password_hash = passwordHash
			user.updated_at = new Date().toISOString()

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE users') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user || user.deleted_at !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			user.deleted_at = timestamp
			user.updated_at = timestamp
			user.is_active = false

			return { rowCount: 1, rows: [] }
		}

		throw new Error(`Unsupported database query: ${sql}`)
	}

	async transaction() {
		throw new Error('Not implemented in fake database')
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
