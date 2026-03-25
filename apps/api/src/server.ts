import process from 'node:process'

import { db } from './db/db.ts'
import { buildApp } from './app.ts'
import type { NodeEnvTypes } from './types/app.d.ts'

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
const host = process.env.HOST || '0.0.0.0'
const nodeEnv = (process.env.NODE_ENV as NodeEnvTypes) || 'dev'
const sessionSecret = process.env.SESSION_SECRET
const passwordPepper = process.env.PASSWORD_PEPPER

if (!sessionSecret) {
	console.error('SESSION_SECRET environment variable is required')
	process.exit(1)
}

if (!passwordPepper) {
	console.error('PASSWORD_PEPPER environment variable is required')
	process.exit(1)
}

if (!nodeEnv || !['dev', 'prod', 'test'].includes(nodeEnv)) {
	console.error('NODE_ENV environment variable must be one of "dev", "prod", or "test"')
	process.exit(1)
}

const app = buildApp({
	sessionSecret,
	passwordPepper,
	nodeEnv,
	database: db,
})

try {
	await db.testConnection()

	const address = await app.listen({ port, host })
	app.log.info(`server listening on ${address}`)
} catch (error) {
	if (error) {
		await db.closePool()
		app.log.error(error)
		process.exit(1)
	}
}
