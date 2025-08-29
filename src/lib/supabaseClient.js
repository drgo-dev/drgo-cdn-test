import { createClient } from '@supabase/supabase-js'

// 여기에 본인의 Supabase API 정보를 입력하세요.
const supabaseUrl = 'https://dchtynddqgoqqthiqihn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaHR5bmRkcWdvcXF0aGlxaWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTkyMTEsImV4cCI6MjA3MTkzNTIxMX0.auQ2t3Jv3AlX9Iu5v-F4WKyN8id1akll4xxakpihg4A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)