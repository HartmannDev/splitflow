import type { FastifyInstance } from 'fastify'

import { requireAuth, requireRole } from '../auth/route-validator.ts'
import { buildCurrencyController } from './controller.ts'
import { buildCurrencyDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function currenciesRoute(app: FastifyInstance, deps: AppDependency) {
	const { getCurrencies, createCurrency, updateCurrency, deleteCurrency } = buildCurrencyController(deps)
	const { getCurrenciesDocs, createCurrencyDocs, updateCurrencyDocs, deleteCurrencyDocs } = buildCurrencyDocs()

	app.get('/currencies', { schema: getCurrenciesDocs, preHandler: [requireAuth, requireRole('admin')] }, getCurrencies)
	app.post('/currencies', { schema: createCurrencyDocs, preHandler: [requireAuth, requireRole('admin')] }, createCurrency)
	app.patch(
		'/currencies/:code',
		{ schema: updateCurrencyDocs, preHandler: [requireAuth, requireRole('admin')] },
		updateCurrency,
	)
	app.delete(
		'/currencies/:code',
		{ schema: deleteCurrencyDocs, preHandler: [requireAuth, requireRole('admin')] },
		deleteCurrency,
	)
}
