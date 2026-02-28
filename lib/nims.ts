import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

/**
 * Custom embeddings class for NVIDIA NIM API
 * Adds required input_type parameter for asymmetric embedding models
 */
class NvidiaEmbeddings extends OpenAIEmbeddings {
    async embedDocuments(texts: string[]) {
        const params: any = {
            model: this.model,
            input: texts,
            input_type: "passage", // Required for documents/chunks
        };

        const response = await this.embeddingWithRetry(params);
        return response.data.map((item: any) => item.embedding);
    }

    async embedQuery(text: string) {
        const params: any = {
            model: this.model,
            input: text,
            input_type: "query", // Required for queries
        };

        const response = await this.embeddingWithRetry(params);
        return response.data[0].embedding;
    }
}

/**
 * Get embeddings for documents/passages (used when indexing PDFs)
 */
export const getNimsDocumentEmbeddings = () => {
    return new NvidiaEmbeddings({
        model: "nvidia/nv-embedqa-e5-v5",
        apiKey: process.env.NVIDIA_API_KEY,
        configuration: {
            baseURL: "https://integrate.api.nvidia.com/v1",
        }
    });
};

/**
 * Get embeddings for search queries (used when user asks questions)
 * Note: Uses the same class, but embedQuery method will use "query" input_type
 */
export const getNimsQueryEmbeddings = () => {
    return new NvidiaEmbeddings({
        model: "nvidia/nv-embedqa-e5-v5",
        apiKey: process.env.NVIDIA_API_KEY,
        configuration: {
            baseURL: "https://integrate.api.nvidia.com/v1",
        }
    });
};

/**
 * Default export - defaults to document embeddings for backward compatibility
 * Use this when uploading/indexing PDFs
 */
export const getNimsEmbeddings = getNimsDocumentEmbeddings;

/**
 * Get NVIDIA NIM LLM instance
 */
export const getNimsLLM = (streaming: boolean = false) => {
    return new ChatOpenAI({
        model: "meta/llama-3.1-70b-instruct",
        temperature: 0,
        streaming: streaming,
        apiKey: process.env.NVIDIA_API_KEY,
        configuration: {
            baseURL: "https://integrate.api.nvidia.com/v1",
        }
    });
};