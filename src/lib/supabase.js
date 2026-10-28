import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT_ID') && !anonKey.includes('YOUR_SUPABASE'))
export const supabase = isSupabaseConfigured ? createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null

export const BUCKET = 'memories'
export function publicMediaUrl(path) {
  if (!supabase || !path) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
