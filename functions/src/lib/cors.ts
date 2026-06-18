import type { Request, Response } from 'express'

export function applyCors(req: Request, res: Response, methods = 'GET,POST,OPTIONS') {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept')
  res.setHeader('Access-Control-Max-Age', '86400')
  res.setHeader('Vary', 'Origin')
}

export function handlePreflight(req: Request, res: Response, methods = 'GET,POST,OPTIONS'): boolean {
  applyCors(req, res, methods)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

export function sendJson(res: Response, statusCode: number, body: unknown) {
  res.status(statusCode).json(body)
}
