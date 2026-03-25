import type { User } from '../../src/modules/users/model.ts'

type SessionRow = {
	sess: string
	expires_at: Date
}

type UserRow = Pick<User, 'id' | 'role' | 'name' | 'lastname' | 'email'> & {
	password_hash: string
	email_verified_at: string | null
	deleted_at: string | null
	is_active: boolean
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

		if (sql.includes('SELECT sess, expires_at')) {
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
						expires_at: session.expires_at,
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

	async query(sql: string, params?: any[]) {
		const queryParams = params ?? []

		if (sql.includes('SELECT id, email, password_hash, role') && sql.includes('FROM users')) {
			const [email] = queryParams as [string]
			const user = [...this.users.values()].find(
				(candidate) =>
					candidate.email.toLowerCase() === email.toLowerCase() && candidate.deleted_at === null && candidate.is_active,
			)

			return {
				rowCount: user ? 1 : 0,
				rows: user ? [user] : [],
			}
		}

		if (sql.includes('INSERT INTO users')) {
			const [id, name, lastname, email, passwordHash, emailVerifiedAt] = queryParams as [
				string,
				string,
				string,
				string,
				string,
				string | null,
			]

			const emailExists = [...this.users.values()].some((user) => user.email.toLowerCase() === email.toLowerCase())

			if (emailExists) {
				throw { code: '23505' }
			}

			this.users.set(id, {
				id,
				role: 'user',
				name,
				lastname,
				email,
				password_hash: passwordHash,
				email_verified_at: emailVerifiedAt,
				deleted_at: null,
				is_active: true,
			})

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
		this.users.set(user.id, user)
	}
}

export type { UserRow }
