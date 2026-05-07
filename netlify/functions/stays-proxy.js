function requireEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return String(value).trim()
}

function base64Encode(input) {
  return Buffer.from(input, 'utf8').toString('base64')
}

function buildCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin
  const corsHeaders = buildCorsHeaders(origin)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const staysBaseUrl = requireEnv('STAYS_BASE_URL').replace(/\/+$/, '')
    const staysLogin = requireEnv('STAYS_LOGIN')
    const staysPassword = requireEnv('STAYS_PASSWORD')

    const functionPrefix = '/.netlify/functions/stays-proxy/'
    const path = String(event.path || '')
    const splat = path.includes(functionPrefix) ? path.split(functionPrefix)[1] : ''
    const queryString = event.rawQuery ? `?${event.rawQuery}` : ''
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
    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
        // evita cache de dados de hóspede no edge/cdn
        'Cache-Control': 'no-store',
      },
      body: bodyText,
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Stays proxy failure',
        message: e instanceof Error ? e.message : 'Unknown error',
      }),
    }
  }
}

