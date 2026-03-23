import type { Session } from 'fastify'
import type { SessionStore } from '@fastify/session'
import type { Pool } from 'pg'

type Callback = (err?: Error | null) => void
type GetCallback = (err: Error | null, result?: Session | null) => void

export class PgSessionStore implements SessionStore {
	private readonly pool: Pool

	constructor(pool: Pool) {
		this.pool = pool
	}

	set(sessionId: string, session: Session, callback: Callback): void {
		void (async () => {
			try {
				const expiresAt = this.resolveExpiresAt(session)

				await this.pool.query(
					`
					INSERT INTO sessions (sid, sess, expires_at, updated_at)
					VALUES ($1, $2::jsonb, $3, NOW())
					ON CONFLICT (sid)
					DO UPDATE SET
						sess = EXCLUDED.sess,
						expires_at = EXCLUDED.expires_at,
						updated_at = NOW()
					`,
					[sessionId, JSON.stringify(session), expiresAt],
				)

				callback(null)
			} catch (error) {
				callback(error as Error)
			}
		})()
	}

	get(sessionId: string, callback: GetCallback): void {
		void (async () => {
			try {
				const result = await this.pool.query(
					`
					SELECT sess, expires_at
					FROM sessions
					WHERE sid = $1
					LIMIT 1
					`,
					[sessionId],
				)

				if (result.rowCount === 0) {
					callback(null, null)
					return
				}

				const row = result.rows[0]

				if (new Date(row.expires_at).getTime() <= Date.now()) {
					await this.pool.query(`DELETE FROM sessions WHERE sid = $1`, [sessionId])
					callback(null, null)
					return
				}

				callback(null, row.sess as Session)
			} catch (error) {
				callback(error as Error, null)
			}
		})()
	}

	destroy(sessionId: string, callback: Callback): void {
		void (async () => {
			try {
				await this.pool.query(`DELETE FROM sessions WHERE sid = $1`, [sessionId])
				callback(null)
			} catch (error) {
				callback(error as Error)
			}
		})()
	}

	private resolveExpiresAt(session: Session): Date {
		const expires = session.cookie.expires
		if (expires) {
			return expires
		}

		const maxAge = session.cookie.originalMaxAge ?? session.cookie.maxAge

		if (typeof maxAge === 'number') {
			return new Date(Date.now() + maxAge)
		}

		return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
	}
}
