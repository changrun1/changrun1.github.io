import { getEmbeddedToken } from './secretToken.js'

export async function fetchRateLimit(){
  let token = ''
  try { token = getEmbeddedToken() } catch(e) { /* ignore */ }
  const res = await fetch('https://api.github.com/rate_limit', {
    headers: token ? { 'Authorization': `Bearer ${token}`, 'Accept':'application/vnd.github+json' } : { 'Accept':'application/vnd.github+json' },
    cache: 'no-store'
  })
  if(!res.ok){
    return { error: res.status, message: await res.text() }
  }
  const json = await res.json()
  const core = json.resources?.core || {}
  return {
    limit: core.limit,
    remaining: core.remaining,
    resetEpoch: core.reset,
    resetDate: core.reset ? new Date(core.reset*1000) : null,
  }
}
