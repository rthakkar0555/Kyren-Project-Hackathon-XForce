import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: pdfs, error: dbError } = await supabase
            .from("pdfs")
            .select("*")
            .eq("user_id", user.id)
            .order("uploaded_at", { ascending: false });

        if (dbError) {
            throw dbError;
        }

        return NextResponse.json({ success: true, data: pdfs });

    } catch (error) {
        console.error("Fetch PDFs Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
