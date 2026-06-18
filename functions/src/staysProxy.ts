import express from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { applyCors, handlePreflight, sendJson } from './lib/cors.js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return String(value).trim()
}

function base64Encode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64')
}

const app = express()

app.use((req, res, next) => {
  if (handlePreflight(req, res, 'GET,OPTIONS')) return
  applyCors(req, res, 'GET,OPTIONS')
  next()
})

app.get(/^\/api\/stays\/(.*)$/, async (req, res) => {
  try {
    const staysBaseUrl = requireEnv('STAYS_BASE_URL').replace(/\/+$/, '')
    const staysLogin = requireEnv('STAYS_LOGIN')
    const staysPassword = requireEnv('STAYS_PASSWORD')

    const splat = req.path.replace(/^\/api\/stays\/?/, '')
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const targetUrl = `${staysBaseUrl}/${splat}${queryString}`

    const auth = `Basic ${base64Encode(`${staysLogin}:${staysPassword}`)}`

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
    })

    const bodyText = await response.text()
    res.status(response.status)
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.send(bodyText)
  } catch (e) {
    sendJson(res, 500, {
      error: 'Stays proxy failure',
      message: e instanceof Error ? e.message : 'Unknown error',
    })
  }
})

export const staysProxy = onRequest(
  {
    region: 'southamerica-east1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  app,
)
