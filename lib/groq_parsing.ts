import Groq from "groq-sdk";

const client = new Groq({ apiKey: "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", dangerouslyAllowBrowser: true });

export async function getSummary(fileStr: string, query: string) {
  console.log(fileStr);
  const chatCompletion = await client.chat.completions.create({
    "messages": [
      {
        "role": "system",
        "content": `You are an expert researcher who is able to deduce the relevant content within files. 
        Your job is to take the following file content. 
        Once you receive a query, your sole task is to return an extremely concise summary of the file, 
        giving a breif explanation without further reasoning whatsoever, returning the text verbatim 
        of the section most relevant to the file. This section must be NO MORE THAN A VERY SHORT SENTENCE. 
        You must not prompt the user further than this.\n\nYou will be provided the file's content in text 
        form and nothing else. \n\n`
      },
      {
        "role": "user",
        "content": `## FILE CONTENT ${fileStr}`
      }
    ],
    "model": "llama-3.2-3b-preview",
    "temperature": 1,
    "max_tokens": 1024,
    "top_p": 1,
    "stream": false,
    "stop": null
  });

//   for await (const chunk of chatCompletion) {
//     process.stdout.write(chunk.choices[0]?.delta?.content || '');
//   }
    return chatCompletion.choices[0]?.message?.content || '';
}
