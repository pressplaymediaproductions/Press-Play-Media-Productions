// Press Play Media Productions Supabase config
// Your anon/public key is safe in frontend code. Never place service_role keys here.
const SUPABASE_URL = "https://hibcgbidpiqqvcucsndn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpYmNnYmlkcGlxcXZjdWNzbmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDQ5MTUsImV4cCI6MjA5NTkyMDkxNX0.R7fSYIhF77cXMjai5S2CEirImne8w1kcU1Om6TJybe0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
