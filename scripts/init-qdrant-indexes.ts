// Script to manually create Qdrant payload indexes
// Run with: node --loader tsx scripts/init-qdrant-indexes.ts

import { config } from 'dotenv';
import { initQdrant } from '../lib/qdrant';

// Load environment variables
config();

async function main() {
    console.log('🔧 Initializing Qdrant indexes...');
    await initQdrant();
    console.log('✅ Done!');
    process.exit(0);
}

main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
