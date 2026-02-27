import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import qdrantClient, { COLLECTION_NAME } from "@/lib/qdrant";

export async function DELETE(req: NextRequest) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const pdfId = searchParams.get("id");

        if (!pdfId) {
            return NextResponse.json({ error: "PDF ID is required" }, { status: 400 });
        }

        // 1. Get PDF details & Verify ownership (or Admin)
        // Assuming 'role' is in user metadata or a profile table. 
        // For now, strict ownership check unless handled otherwise.
        const { data: pdf, error: fetchError } = await supabase
            .from("pdfs")
            .select("*")
            .eq("id", pdfId)
            .single();

        if (fetchError || !pdf) {
            return NextResponse.json({ error: "PDF not found" }, { status: 404 });
        }

        // Role check: Allow if owner OR admin (implementation depends on user role storage)
        // Simple owner check for now:
        if (pdf.user_id !== user.id) {
            // TODO: Check for admin role if needed
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 2. Delete from Cloudinary
        await deleteFromCloudinary(pdf.cloudinary_public_id);

        // 3. Delete from Qdrant (Vectors)
        await qdrantClient.delete(COLLECTION_NAME, {
            filter: {
                must: [
                    { key: "pdf_id", match: { value: pdfId } }
                ]
            }
        });

        // 4. Delete from DB (PDFs table - cascades to chats if configured, else delete chats manual)
        // Migration said ON DELETE CASCADE for chats referencing pdfs, so this is fine.
        const { error: deleteError } = await supabase
            .from("pdfs")
            .delete()
            .eq("id", pdfId);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
