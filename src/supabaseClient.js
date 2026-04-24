import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tcjgigltxrxiuslfnthj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjamdpZ2x0eHJ4aXVzbGZudGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTYyNjMsImV4cCI6MjA5MjQ3MjI2M30.UxpJ7EFMSrbrqgJhK8_8ajnkE8pswhjbblXcwXZUwc0'

export const supabase = createClient(supabaseUrl, supabaseKey)
