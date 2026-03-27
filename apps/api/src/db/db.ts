import { readFileSync } from 'node:fs'

import { Pool, type PoolClient } from 'pg'

const readEnvValue = (name: string) => {
	const filePath = process.env[`${name}_FILE`]

	if (filePath) {
		return readFileSync(filePath, 'utf8').trim()
	}

	return process.env[name]
}

const pool = new Pool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	user: process.env.DB_USER,
	password: readEnvValue('DB_PASSWORD'),
	database: process.env.DATABASE,
})

const query = async (sql: string, params?: any[]) => {
	const client = await pool.connect()
	try {
		return await client.query(sql, params)
	} finally {
		client.release()
	}
}

const transaction = async (callback: (client: PoolClient) => Promise<void>) => {
	const client = await pool.connect()
	try {
		await client.query('BEGIN')

		await callback(client)

		await client.query('COMMIT')
	} catch (error) {
		await client.query('ROLLBACK')
		throw error
	} finally {
		client.release()
	}
}

const closePool = async () => {
	await pool.end()
}

const testConnection = async () => {
	var client = await pool.connect()
	try {
		console.log('Connected to the PostgreSQL database successfully!')
		client.release()
	} catch (_err) {
		const err: Error = _err as Error
		err.message = `Database connection failed: ${err.message}`
		throw err
	}
}

export const db = {
	query,
	transaction,
	closePool,
	testConnection,
	pool,
}

export type Database = typeof db
