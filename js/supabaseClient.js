// Importa a função para criar o cliente do Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- CONFIGURAÇÃO DO SUPABASE ---
// Substitua com os dados do SEU projeto Supabase
const SUPABASE_URL = 'https://ijtjsmwomwdtcywjmdwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdGpzbXdvbXdkdGN5d2ptZHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTE0ODgsImV4cCI6MjA3NTM2NzQ4OH0.Kfqk0CqlQYR16PGOID3QO5kV8jQhfqP6eurFiuoNCac';

// Cria e exporta o cliente Supabase para que outros arquivos possam usá-lo
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
