import { NextRequest, NextResponse } from "next/server";
import { initQdrant } from "@/lib/qdrant";

export async function POST(req: NextRequest) {
    try {
        console.log("Initializing Qdrant indexes...");
        await initQdrant();
        console.log("Qdrant indexes initialized successfully");

        return NextResponse.json({
            success: true,
            message: "Qdrant indexes initialized successfully"
        });
    } catch (error) {
        console.error("Error initializing Qdrant indexes:", error);
        return NextResponse.json({
            error: "Failed to initialize Qdrant indexes",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
