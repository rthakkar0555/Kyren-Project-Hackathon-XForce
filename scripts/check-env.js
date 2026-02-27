
require('dotenv').config();

const checks = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', validator: val => val && val.startsWith('https://') && !val.includes('example'), msg: 'Valid Supabase URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', validator: val => val && val.length > 20 && !val.includes('placeholder'), msg: 'Valid Anon Key' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', validator: val => val && val.length > 20 && !val.includes('placeholder'), msg: 'Valid Service Role Key' },
    { key: 'OPENAI_API_KEY', validator: val => val && val.startsWith('sk-') && !val.includes('placeholder'), msg: 'Valid OpenAI Key' },
    { key: 'GOOGLE_GENERATIVE_AI_KEY', validator: val => val && val.length > 10 && !val.includes('placeholder'), msg: 'Valid Gemini Key' }
];

console.log("Checking .env configuration...");
let allGood = true;

checks.forEach(check => {
    const val = process.env[check.key];
    if (check.validator(val)) {
        console.log(`[OK] ${check.key}: ${check.msg}`);
    } else {
        console.log(`[FAIL] ${check.key}: Missing or invalid format`);
        allGood = false;
    }
});

if (allGood) {
    console.log("\nSuccess! All environment variables appear to be correctly formatted.");
} else {
    console.log("\nReview the failed keys above.");
}
