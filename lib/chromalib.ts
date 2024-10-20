import { getClient, ResponseType } from "@tauri-apps/api/http";

let CHROMA_QUERY_BASE = "http://localhost:35443/query/"

export async function queryChroma(query: string) {
    const response = fetch(
        CHROMA_QUERY_BASE + query + '/20',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    )

    const data = (await response).json()
    const result = await data;
    console.log(result);
    return result;
}