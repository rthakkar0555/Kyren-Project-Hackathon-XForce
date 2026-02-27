import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { getNimsDocumentEmbeddings } from "@/lib/nims";
import { COLLECTION_NAME, initQdrant } from "@/lib/qdrant";
// pdf-parse v1.1.1 — exports a plain async function(buffer, options) => ParseResult
import pdfParse from "pdf-parse";


export const maxDuration = 60; // Allow 60 seconds for processing

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        let pdfRecord: any = null;

        // 1. Process PDF (Extract, Chunk, Embed, Store)
        try {
            console.log("1. Starting PDF processing...");

            // Convert to buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 2. Upload to Cloudinary (for URL storage)
            console.log("2. Uploading to Cloudinary...");
            const { secure_url, public_id } = await uploadToCloudinary(file);
            console.log("3. Uploaded to Cloudinary:", secure_url);

            // 3. Save initial record to DB
            const { data, error: dbError } = await supabase
                .from("pdfs")
                .insert({
                    user_id: user.id,
                    file_name: file.name,
                    cloudinary_url: secure_url,
                    cloudinary_public_id: public_id,
                    status: "processing",
                })
                .select()
                .single();

            if (dbError) {
                console.error("DB Error:", dbError);
                throw new Error(`DB Error: ${dbError.message}`);
            }
            pdfRecord = data;

            console.log("5. Parsing PDF with pdf-parse v1...");

            // Custom render function to extract text per page
            let pageTexts: { page: number; text: string }[] = [];
            const options = {
                pagerender: function (pageData: any) {
                    return pageData.getTextContent()
                        .then(function (textContent: any) {
                            let lastY: any, text = '';
                            for (let item of textContent.items) {
                                if (lastY == item.transform[5] || !lastY) {
                                    text += item.str;
                                } else {
                                    text += '\n' + item.str;
                                }
                                lastY = item.transform[5];
                            }
                            pageTexts.push({
                                page: pageData.pageNumber,
                                text: text
                            });
                            return text;
                        });
                }
            };

            await pdfParse(buffer, options);

            // Sort by page number just in case
            pageTexts.sort((a, b) => a.page - b.page);
            const totalPages = pageTexts.length;

            console.log(`8. PDF has ${totalPages} pages.`);

            // Create documents with page-level granularity
            const docs = pageTexts.map((p) => {
                return new Document({
                    pageContent: p.text,
                    metadata: {
                        source: secure_url,
                        page: p.page,
                        totalPages: totalPages,
                    }
                });
            });

            console.log(`9. Created ${docs.length} page documents.`);

            console.log("10. Creating chunks...");
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 400, // Increased chunk size for better context
                chunkOverlap: 50,
            });
            const chunks = await splitter.splitDocuments(docs);
            console.log("11. Created", chunks.length, "chunks");

            // Add metadata to chunks
            const chunksWithMetadata = chunks.map((chunk, index) => ({
                ...chunk,
                metadata: {
                    ...chunk.metadata,
                    user_id: user.id,
                    pdf_id: pdfRecord.id,
                    file_name: file.name,
                    cloudinary_public_id: public_id,
                    chunk_index: index,
                    uploaded_at: new Date().toISOString(),
                },
            }));

            console.log("12. Getting embeddings...");
            // ✅ Use document embeddings for indexing
            const embeddings = getNimsDocumentEmbeddings();
            await initQdrant();

            console.log("13. Storing in Qdrant...");
            await QdrantVectorStore.fromDocuments(chunksWithMetadata, embeddings, {
                url: process.env.QDRANT_URL,
                apiKey: process.env.QDRANT_API_KEY,
                collectionName: COLLECTION_NAME,
            });
            console.log("14. Stored in Qdrant successfully");

            // Update DB status
            await supabase
                .from("pdfs")
                .update({ status: "ready", total_chunks: chunks.length })
                .eq("id", pdfRecord.id);

            return NextResponse.json({ success: true, data: pdfRecord });

        } catch (processError: any) {
            console.error("Processing Error:", processError);
            console.error("Error stack:", processError instanceof Error ? processError.stack : "No stack");
            console.error("Error message:", processError instanceof Error ? processError.message : String(processError));

            if (pdfRecord) {
                await supabase
                    .from("pdfs")
                    .update({ status: "error" })
                    .eq("id", pdfRecord.id);
            }

            return NextResponse.json({
                error: "Failed to process PDF",
                details: processError instanceof Error ? processError.message : String(processError)
            }, { status: 500 });
        }

    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}