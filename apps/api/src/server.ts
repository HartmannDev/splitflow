import { readFileSync } from 'node:fs'
import process from 'node:process'

import { buildApp } from './app.ts'
import { db } from './db/db.ts'
import { buildEmailTransporter } from './plugins/nodemailer.ts'

import type { NodeEnvTypes } from './types/app.d.ts'

const readEnvValue = (name: string) => {
	const filePath = process.env[`${name}_FILE`]

	if (filePath) {
		return readFileSync(filePath, 'utf8').trim()
	}

	return process.env[name]
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
const host = process.env.HOST || '0.0.0.0'
const nodeEnv = (process.env.NODE_ENV as NodeEnvTypes) || 'dev'
const sessionSecret = readEnvValue('SESSION_SECRET')
const passwordPepper = readEnvValue('PASSWORD_PEPPER')

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

const emailTransporter = buildEmailTransporter()

const app = buildApp({
	sessionSecret,
	passwordPepper,
	nodeEnv,
	database: db,
	emailTransporter,
})

try {
	await db.testConnection()
	await emailTransporter.verify()

	const address = await app.listen({ port, host })
	app.log.info(`server listening on ${address}`)
} catch (error) {
	if (error) {
		await db.closePool()
		app.log.error(error)
		process.exit(1)
	}
}
