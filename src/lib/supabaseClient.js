import { createClient } from '@supabase/supabase-js'

// 여기에 본인의 Supabase API 정보를 입력하세요.
const supabaseUrl = 'https://dchtynddqgoqqthiqihn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaHR5bmRkcWdvcXF0aGlxaWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1OTIxMSwiZXhwIjoyMDcxOTM1MjExfQ.WiitSTiil9SVrDmUpJ48cPVaHfvnnSae4Ok9nCdVM0U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)