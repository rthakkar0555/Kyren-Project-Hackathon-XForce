import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

export const COLLECTION_NAME = 'kyren_documents';

export const initQdrant = async () => {
    // Check if collection exists, if not create it
    // Note: In production, collection creation is better handled manually or via migration script usually.
    // But for robustness we can check.
    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.find(c => c.name === COLLECTION_NAME);

        if (!exists) {
            await qdrantClient.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 1024, // NVIDIA nv-embedqa-e5-v5 uses 1024 dimensions
                    distance: 'Cosine',
                }
            });

            // Create payload indexes for filtering
            // LangChain stores metadata nested, so we need to index metadata.user_id and metadata.pdf_id
            await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'metadata.user_id',
                field_schema: 'keyword', // keyword index for exact match filtering
            });

            await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'metadata.pdf_id',
                field_schema: 'keyword', // keyword index for exact match filtering
            });

            console.log(`✅ Created collection '${COLLECTION_NAME}' with payload indexes`);
        } else {
            // Ensure indexes exist even if collection already exists
            try {
                await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                    field_name: 'metadata.user_id',
                    field_schema: 'keyword',
                });
            } catch (e) {
                // Index might already exist, that's okay
            }

            try {
                await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                    field_name: 'metadata.pdf_id',
                    field_schema: 'keyword',
                });
            } catch (e) {
                // Index might already exist, that's okay
            }
        }
    } catch (error) {
        console.error("Error initializing Qdrant:", error);
    }
}

export const searchDocuments = async (queryEmbedding: number[], limit: number = 10, filter?: any) => {
    try {
        const result = await qdrantClient.search(COLLECTION_NAME, {
            vector: queryEmbedding,
            limit: limit,
            filter: filter,
            with_payload: true,
        });
        return result;
    } catch (error) {
        console.error("Error searching documents in Qdrant:", error);
        return [];
    }
}


export default qdrantClient;
