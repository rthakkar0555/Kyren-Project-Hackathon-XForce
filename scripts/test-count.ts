
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

async function testCount() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing env vars")
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log("Testing 'head: true' count...")
    const { count: countHead, error: errorHead } = await supabase
        .from("quiz_questions")
        .select("*", { count: "exact", head: true })

    console.log("Head Count:", countHead)
    if (errorHead) console.error("Head Error:", errorHead)

    console.log("Testing 'limit(1)' count...")
    const { count: countLimit, error: errorLimit } = await supabase
        .from("quiz_questions")
        .select("id", { count: "exact" })
        .limit(1)

    console.log("Limit Count:", countLimit)
    if (errorLimit) console.error("Limit Error:", errorLimit)
}

testCount()
