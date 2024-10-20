import { getClient, ResponseType } from "@tauri-apps/api/http";

let CHROMA_QUERY_BASE = "http://localhost:35443/query/"

export interface ChromaFile {
    id: string;
    document: string;
    metadata: {
      filepath: string;
      location: string;
    };
    distance: number;
  }
  

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
    
    const results: ChromaFile[] = result.results.ids[0].map((id: any, index: string | number) => ({
        id,
        document: result.results.documents[0][index],
        metadata: result.results.metadatas[0][index],
        distance: result.results.distances[0][index]
      }));

    return results;
}