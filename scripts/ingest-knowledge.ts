import axios from 'axios';
import * as cheerio from 'cheerio';
import { PineconeService, pineconeService } from '../src/services/pinecone.service';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from 'dotenv';
dotenv.config();

// List of URLs to scrape
// Ideally, we would crawl the site, but for this task we will start with key pages.
const TARGET_URLS = [
    "https://harbourlane.com.au/",
    "https://harbourlane.com.au/pages/about-us",
    "https://harbourlane.com.au/pages/contact",
    "https://harbourlane.com.au/pages/shipping-returns"
];

async function scrapeUrl(url: string): Promise<string> {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        // Remove script, style, and navigation elements to clean up text
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();

        // Extract text from main content
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        return text;
    } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        return "";
    }
}

async function ingest() {
    console.log("Starting ingestion process...");

    for (const url of TARGET_URLS) {
        console.log(`Scraping ${url}...`);
        const text = await scrapeUrl(url);

        if (!text) continue;

        console.log(`Splitting text for ${url}...`);
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.createDocuments([text]);

        console.log(`Generating embeddings and uploading ${chunks.length} chunks...`);
        const vectors = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await PineconeService.generateEmbedding(chunk.pageContent);

            vectors.push({
                id: `${url.replace(/[^a-zA-Z0-9]/g, '_')}_chunk_${i}`,
                values: embedding,
                metadata: {
                    source: url,
                    text: chunk.pageContent
                }
            });
        }

        // Batch upload
        await pineconeService.upsertVectors(vectors);
        console.log(`Successfully uploaded chunks for ${url}`);
    }

    console.log("Ingestion complete.");
}

ingest().catch(console.error);
