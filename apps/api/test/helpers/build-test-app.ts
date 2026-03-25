import type { FastifyInstance } from 'fastify'

import { buildApp } from '../../src/app.ts'
import type { BuildAppOptions } from '../../src/types/app.js'
import { FakeDatabase } from './fake-db.ts'

type TestAppOptions = Partial<Pick<BuildAppOptions, 'passwordPepper' | 'sessionSecret' | 'nodeEnv' | 'logger'>>

const defaultOptions: Pick<BuildAppOptions, 'passwordPepper' | 'sessionSecret' | 'nodeEnv' | 'logger'> = {
	passwordPepper: 'test-pepper',
	sessionSecret: 'test-session-secret-that-is-long-enough',
	nodeEnv: 'test',
	logger: false,
}

export const buildTestApp = (options: TestAppOptions = {}): {
	app: FastifyInstance
	fakeDatabase: FakeDatabase
} => {
	const fakeDatabase = new FakeDatabase()
	const app = buildApp({
		...defaultOptions,
		...options,
		database: fakeDatabase,
	})

	return { app, fakeDatabase }
}
