import Groq from "groq-sdk";

const MODEL = "llama3-groq-8b-8192-tool-use-preview";
const client = new Groq({
  apiKey: "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",
});
const fileContents =
  "Everyone feels worried or anxious or down from time to time. But relatively few people develop a mental illness. What's the difference? A mental illness is a mental health condition that gets in the way of thinking, relating to others, and day-to-day function. Dozens of mental illnesses have been identified and defined. They include depression, generalized anxiety disorder, bipolar disorder, obsessive-compulsive disorder, post-traumatic stress disorder, schizophrenia, and many more. Mental illness is an equal opportunity issue. It affects young and old";
const query = "mental illness";

// Function to fetch and highlight relevant text
const highlights = async (
  fileContents: string,
  query: string,
): Promise<void> => {
  const messages = [
    {
      role: "user",
      content: `Read this text and then UPPERCASE ANYTHING that MAY OR MAY NOT pertain to the query: "${query}". ${fileContents}. ANY
            RELEVANT TERMS OR INFORMATION RELATED TO THE QUERY "${query}" SHOULD BE HIGHLIGHTED OR UPPERCASED. IF THERE ARE NO UPPERCASES, THERE IS SOMETHING WRONG
            TRY AGAIN. Good luck!`,
    },
  ];

  // Send request to Groq to get inferred highlights
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: messages,
    stream: false,
    max_tokens: 1012, // Adjust as needed
  });

  // Output the highlighted result
  console.log(response.choices[0].message.content);
};

// Call the function
highlights(fileContents, query);
