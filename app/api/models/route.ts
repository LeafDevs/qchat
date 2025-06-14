import {auth} from "@/lib/auth"

import { headers } from "next/headers";
 
const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
})

export const GET = async () => {

    // collective models
    const models = [
        // Gemini
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        // OpenAI
        "GPT-4o",
        "o4-mini",
        "GPT-4.1",
        "GPT-4.1-nano",
        "GPT-4.1-mini",
        // Claude
        "claude-4-sonnet",
        "claude-3.5-sonnet",
        "claude-3.7-sonnet",
    ]


}