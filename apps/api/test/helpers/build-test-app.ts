import type { FastifyInstance } from 'fastify'

import { buildApp } from '../../src/app.ts'
import { FakeDatabase } from './fake-db.ts'

import type { BuildAppOptions } from '../../src/types/app.js'
import type { EmailTransporter } from '../../src/plugins/nodemailer.ts'

type TestAppOptions = Partial<Pick<BuildAppOptions, 'passwordPepper' | 'sessionSecret' | 'nodeEnv' | 'logger'>>
type SentEmail = {
	to: string
	subject: string
	html: string
}

const defaultOptions: Pick<BuildAppOptions, 'passwordPepper' | 'sessionSecret' | 'nodeEnv' | 'logger'> = {
	passwordPepper: 'test-pepper',
	sessionSecret: 'test-session-secret-that-is-long-enough',
	nodeEnv: 'test',
	logger: false,
}

const buildFakeEmailTransporter = (sentEmails: SentEmail[]): EmailTransporter =>
	({
		sendMail: async (mailOptions: { to: string; subject: string; html: string }) => {
			sentEmails.push({
				to: mailOptions.to,
				subject: mailOptions.subject,
				html: mailOptions.html,
			})

			return {
				messageId: 'test-message-id',
			}
		},
		verify: async () => true,
	}) as EmailTransporter

export const buildTestApp = (
	options: TestAppOptions = {},
): {
	app: FastifyInstance
	fakeDatabase: FakeDatabase
	sentEmails: SentEmail[]
} => {
	const fakeDatabase = new FakeDatabase()
	const sentEmails: SentEmail[] = []
	const app = buildApp({
		...defaultOptions,
		...options,
		database: fakeDatabase,
		emailTransporter: buildFakeEmailTransporter(sentEmails),
	})

	return { app, fakeDatabase, sentEmails }
}
