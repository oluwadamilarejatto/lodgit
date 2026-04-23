import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tcjgiglbmxiusfnthj.supabase.co'
const supabaseKey = 'sb_publishable_07QLWmXneyhkyGsiZiGWGA_A6lGqlLn'

export const supabase = createClient(supabaseUrl, supabaseKey)
