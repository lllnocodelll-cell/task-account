import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 25
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  const allowedEnv = Deno.env.get('ALLOWED_ORIGINS')
  let allowOrigin = '*'

  if (allowedEnv) {
    const allowedList = allowedEnv.split(',').map((item) => item.trim()).filter(Boolean)
    allowOrigin = origin && allowedList.includes(origin) ? origin : (allowedList[0] || '')
  } else if (origin) {
    allowOrigin = origin
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  if (rateLimitStore.size > 500) {
    for (const [k, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) rateLimitStore.delete(k)
    }
  }

  const current = rateLimitStore.get(key)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }

  current.count += 1
  return { allowed: true, retryAfterSec: 0 }
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token de autenticação ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração do Supabase ausente na Edge Function')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: authData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const rate = checkRateLimit(authData.user.id)
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: 'Limite de consultas atingido. Aguarde alguns segundos.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rate.retryAfterSec) },
        status: 429,
      })
    }

    const { cnpj } = await req.json()
    if (!cnpj || typeof cnpj !== 'string') {
      throw new Error('CNPJ is required')
    }

    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (!/^\d{14}$/.test(cleanCnpj)) {
      throw new Error('CNPJ inválido. Informe 14 dígitos numéricos.')
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Erro interno' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
