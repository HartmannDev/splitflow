import process from 'node:process'

import { db } from './db/db.ts'
import { buildApp } from './app.ts'

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
const host = process.env.HOST || '0.0.0.0'
const nodeEnv = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'
const sessionSecret = process.env.SESSION_SECRET

if (!sessionSecret) {
	console.error('SESSION_SECRET environment variable is required')
	process.exit(1)
}

const app = buildApp({
	sessionSecret,
	nodeEnv,
	pool: db.pool,
})

try {
	await db.testConnection()

	app.listen({ port, host }, (address) => {
		app.log.error(`server listening on ${address}`)
	})
} catch (error) {
	if (error) {
		db.closePool()
		app.log.error(error)
		process.exit(1)
	}
}
