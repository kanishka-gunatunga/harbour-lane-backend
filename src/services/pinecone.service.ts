import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from 'dotenv';
dotenv.config();

export class PineconeService {
    private client: Pinecone;
    private indexName: string;
    private updateQueue: any[] = [];
    private isProcessing = false;

    constructor() {
        const apiKey = process.env.PINECONE_API_KEY;
        this.indexName = process.env.PINECONE_INDEX || 'harbour-lane';

        if (!apiKey) {
            throw new Error("PINECONE_API_KEY is not defined in .env");
        }

        this.client = new Pinecone({ apiKey });
    }

    private getIndex() {
        return this.client.index(this.indexName);
    }

    async upsertVectors(vectors: { id: string, values: number[], metadata: any }[]) {
        const index = this.getIndex();
        await index.upsert(vectors);
    }

    async queryVectors(vector: number[], topK: number = 5) {
        const index = this.getIndex();
        const result = await index.query({
            vector,
            topK,
            includeMetadata: true
        });
        return result.matches;
    }

    static async generateEmbedding(text: string): Promise<number[]> {
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-3-small",
            dimensions: 1024
        });
        return await embeddings.embedQuery(text);
    }
}

export const pineconeService = new PineconeService();
