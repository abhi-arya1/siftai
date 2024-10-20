import Groq from "groq-sdk";

type HighlightFunction = (fileContents: string, query: string) => Promise<string>;

type ChatMessage = {
    role: "system" | "user" | "assistant" | "function";
    content: string | null;
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
};

type ToolDefinition = {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                [key: string]: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
};

// Initialize Groq client
const client = new Groq({ apiKey: "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" });
const MODEL = "llama3-groq-8b-8192-tool-use-preview";

// Highlight function to uppercase strings if they contain the query
const read_text_and_highlight: HighlightFunction = async (fileContents, query) => {
    // Prepare the Groq request 
    const messages = [
        {
            role: "system",
            content: "You are an assistant that identifies and lists key phrases related to a given query within a text. Provide your response as a comma-separated list of exact phrases from the text, without any additional commentary."
        },
        {
            role: "user",
            content: `Identify key phrases related to "${query}" in the following text:\n\n${fileContents}`
        }
    ];

    // Send request to Groq to get inferred highlights
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: messages,
        stream: false,
        max_tokens: 4096 // Adjust as needed
    });
    
    const inference = response.choices[0].message.content;

    if (typeof inference !== 'string') {
        throw new Error("Unexpected response format from Groq API");
    }

    // Split the inference into individual phrases
    const phrases = inference.split(',').map(phrase => phrase.trim());

    // Create a regex pattern from the phrases
    const pattern = phrases.map(phrase => {
        // Escape special regex characters
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Make the last 's' optional to catch both singular and plural forms
        return escapedPhrase.replace(/s?$/, 's?');
    }).join('|');

    const regex = new RegExp(`(${pattern})`, 'gi');

    // Highlight (uppercase) the matched phrases in the original text
    const highlightedText = fileContents.replace(regex, match => match.toUpperCase());
    
    return highlightedText;
};

async function runConversation(userPrompt: string, query: string): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: "You are an assistant whose only task is to read a text and highlight the given text that is important to the query by uppercasing it. Please do so with the read_text_and_highlight function provided.",
        },
        {
            role: "user",
            content: userPrompt,
        },
        {
            role: "user",
            content: `Highlight the following based on the query: ${query}`,
        }
    ];

    const tools: ToolDefinition[] = [
        {
            type: "function",
            function: {
                name: "read_text_and_highlight",
                description: "Read text and highlight the given text that is important to the query by uppercasing it.",
                parameters: {
                    type: "object",
                    properties: {
                        fileContents: {
                            type: "string",
                            description: "The text to read and highlight from",
                        },
                        query: {
                            type: "string",
                            description: "The query to search for in the text.",
                        }
                    },
                    required: ["fileContents", "query"],
                },
            },
        }
    ];

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: messages,
            stream: false,
            tools: tools,
            tool_choice: "auto",
            max_tokens: 4096
        });

        const msg = response.choices[0].message;
        const toolCalls = msg.tool_calls || [];

        if (toolCalls.length > 0) {
            const availableFunctions: { [key: string]: Function } = {
                "read_text_and_highlight": read_text_and_highlight
            };

            // Process only the first tool call
            const toolCall = toolCalls[0];
            const functionName = toolCall.function.name;
            const functionToCall = availableFunctions[functionName];
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // Call the function and get the highlighted response
            const finalResponse = await functionToCall(functionArgs.fileContents, functionArgs.query);

            return finalResponse.trim();
        }

        return msg.content || "";
    } catch (error) {
        console.error("Error during API call:", error);
        return "An error occurred.";
    }
}

// Run the conversation with the prompt and query
runConversation(
    `Background

Previously, we saw that Python's design includes two related concepts that address the problem of obtaining a sequence of values one at a time.

An iterable is an object that can produce a sequence of values, one at a time.
An iterator is an object that manages the process of producing a sequence of values.
Data structures like lists, tuples, sets, and dictionaries certainly fall into the category of objects whose contents we might want to iterate. But iteration is not only useful in conjunction with data structures. Iteration just means "I want a sequence of values, one at a time," which comes up surprisingly often in sofware design. Ranges, as we've seen, feel like they might be data structures, but really aren't. Their contents are entirely formulaic, so, as long as they know the formula — the start, the stop, and the step — they can quickly calculate any values that are needed. Their design makes one of computer science's classic tradeoffs: spending time to recalculate their values, rather than spending memory to remember what they are. (This is a good trade to make when the cost of recalculation is low, which is certainly the case with a range, since calculating an element boils down to one addition and one multiplication.)

When we need to process the lines of text from a file sequentially, one straightforward approach is the one shown below, which breaks the problem into a sequence of simple steps.

# Step 1: Read the file into a string variable
with open(file_path, 'r') as the_file:
    contents = the_file.read()

# Step 2: Split that string into a list of strings, where each line of text in
# the original string is one element of the list.
lines = contents.splitlines()

# Step 3: Iterate through the list of strings and process each one.  It's not
# particularly important what the process function does here, as we're focused
# on a general approach here, not a particular problem, but let's assume that
# we can process each line entirely separately from the others.
for line in lines:
    process(line)
This approach is not entirely without merit. It's simple to understand, because it does the job the way you might describe it to someone: read the file, split it into lines, and process the lines. We do want all three of those things to be done, and we could certainly do them sequentially like this. Once we have all of the text loaded, we have everything we need to be able split it into separate lines. Once we have all the lines split up, we have everything we need to be able to process them.

But this approach also has a cost that we need to consider here. What happens when the file contains 10,000,000 lines of text, each containing 1,000 characters of text? Here's what our approach will do.

Read a total of 10,000,000 * 1,000 = 10,000,000,000 characters into one string called contents. (This means we need around 10 GB of memory to store that string.)
Split that 10,000,000,000-character string into 10,000,000 strings with 1,000 characters each, then store those strings in a list. (This means we need another 10 GB or so of memory to store all of the smaller strings, because we can't throw away the original string until we're finished splitting it up.)
Iterate through the list of strings, processing each one separately.
It's important to point out that some of these costs are essential.

No matter what, we'll need to read the entire file from beginning to end.
No matter what, we'll need to find the newline characters and split each line from the one that follows it.
No matter what, we'll need to process each of the lines.
But some of these costs are not essential at all. If our goal is to process lines separately, there's never a point in time at which we need to be storing all of them. All we need is one at a time. (It might be more convenient to store them all, but it's not a necessity.)

Or, to put this into the context of asymptotic notation, we're spending O(n) memory (where there are n lines of text in the file) when we could instead be spending O(1) memory. As a practical matter, if n is small, we probably aren't that concerned about it. But if n can grow large, then reducing an O(n) memory requirement to O(1) makes it possible to process large files, where we might otherwise be unable to do so, even if we have plenty of time to wait for the result.

So, how might we fix this problem? Let's consider what you've already seen in previous coursework about reading from text files.

File objects offer a readlines() method

Python's file objects include a readlines() method, which returns all of the (unread) text in the file, organized as a list of strings, where each string in the list is one line of text from the file. With that, we could combine Steps 1 and 2 from our original solution into a single step.

# Step 1. Read the lines of text from the file and store them in a list
# of strings.
with open(file_path, 'r') as the_file:
    lines = the_file.readlines()

# Step 2. Iterate through the list of strings and process each one.
for line in lines:
    process(line)
How much memory did we save in making this change? Instead of storing all of the text in one string, and then storing it again in a list of strings, we'll only be storing one copy of the text. This cut our memory requirement roughly in half — we'll need around 10 GB for our large file instead of 20 GB — but, notably, this is still O(n) memory (i.e., we would still need proportionally more memory for a larger file than we would for a smaller one). In practice, these kinds of changes can sometimes be good enough (e.g., if you know that the files will never be larger than a certain size), but they don't change the general scale of what we can solve. If larger files require proportionally more memory, then ever-larger files will eventually be a problem.

So, this was an improvement, but not a panacea. If we can't find a way to process the first line before reading the second, process the second line before reading the third, and so on, we'll always have this problem. To address that, we'll need to fuse our steps together.

Fusing the steps together

Fortunately, Python's file objects give us a way to do that, because they are themselves iterable. When we iterate them, they produce one line of text at a time, with the iteration ending when there are no more lines of text in the file. We've seen that iterable objects can be used to drive for loops, so, if file objects are iterable, we would expect to be able to drive a for loop with a file object.

with open(file_path, 'r') as the_file:
    for line in the_file:
        process(line)
Reading the file and processing its lines are no longer separate steps at all. They're fused together into what you might call a pipeline. Each time we read a line from the file, we pass that line (and only that line) to our process function and wait until that's finished before we read the next line.

What is our memory requirement now? It depends on what happens behind the scenes when we iterate the lines of a text file. If the file object loads the entire file, splits it into lines, stores them in a list of strings, then iterates that list, we'll be no better off than we were. Instead of us doing something that doesn't scale, it would be Python doing it on our behalf.

Fortunately, that's not the truth of the matter here: Iterating a file means reading enough text from it to produce the first line, getting it back, and only continuing to read from the file when we ask for the second line. You've probably seen before that file objects keep track of a position in the file (i.e., after you read some text from them, your next read will give you the text that comes directly after what you got the first time). They're iterators, which means their __iter__ and __next__ methods provide the mechanism to make all of this work, a lot like our MyRange implementation, but using the file to store all of the information, so that it won't have to be stored again by our Python program.

That means our new solution will read and store only a single line at a time, process that line, and then move on to the next. Our memory requirement is now O(1) rather than O(n). We still have to process the entire file, so our time requirement is O(n) — we'll still need to spend proportionally more time processing larger files compared to smaller ones — but this, like our MyRange iterator, is as good as it gets for iterating and processing n elements: linear time and constant memory.

The downside of fusing the steps together

So, it's clear what we've gained, but what have we lost? In what ways were we better off when we had everything broken into separate steps? This might seem like an unvarnished win, because we have less code and require significantly less memory to run it, but there is a design-related price we've paid: When we fuse things together, we can no longer use them separately, which means we don't have components that be recombined in new ways as our needs change.

That may not cost us anything today, but, over the long haul, those kinds of costs add up. If I want to process files in ten different ways, I'll need to write this same pattern all ten times: open the file (and close it automatically), iterate its lines, and call a function to process each line. If that process plays out ten different times with ten different patterns, some of which are more complicated than the one we just wrote, we end up with a large and complex program where we might otherwise have written a much simpler one, making it more difficult for new team members to join a project and be productive, or for existing team members to be able to keep track of all of the details in their heads as time goes on.

In any programming language, you'll find recurring patterns that you'll need to follow, but one of the things you discover as you learn more about a programming language is that many of these patterns can be replaced by automated techniques. (The with statement has that characteristic, giving us automated wrap-up that we would otherwise have to write by hand each time.) As I'm learning a programming language I don't already know, I'm always on the lookout for ways to remove a boilerplate pattern and replace it with something simpler, or to implement a pattern once and use it repeatedly to avoid having to write it again. I'm always looking for ways to take fused-together pieces and separate them, so I can recombine them in new ways later. For small programs, this is often of little benefit, but for large programs, it's critical.

Given all of that, what we're looking for here are the seams we can use to separate the components of our solution. How could we keep our steps separate while gaining the same benefits we've achieved by fusing them together? That problem is partly solved by the iterables and iterators that we saw previously — which allow us to obtain a sequence of results one at a time — but are solved somewhat more generally by a different Python technique that we've not yet seen.

Generators in Python

A generator in Python is a function that returns a sequence of results, rather than returning a single result. Interestingly, generators don't return all of their results at once; they instead return one result at a time. Even more interestingly, generators don't calculate all of their results at once, either, which means they don't run to completion when you call them, but instead run in fits and starts, doing just enough work to calculate their next result each time they're asked for one.

A good starting point is to see how we obtain generators, so let's start there.

>>> def int_sequence(start, end):
...     current = start
...     while current < end:
...         yield current
...         current += 1
...
>>> int_sequence(3, 8)
    <generator object int_sequence at 0x000002E0D8B04900>
At a glance, our int_sequence function doesn't look particularly special. Its overall shape is a function that counts from the start value to the end. Our call int_sequence(3, 8) looks like it should result in five loop iterations: one each when current is 3, 4, 5, 6, and 7, exiting the loop when current is 8. There's no return statement, so it doesn't look like any values are being returned from it, though there's also a mysterious yield statement, which we haven't seen previously.`,
    "generators"
)
    .then(result => console.log(result))
    .catch(error => console.error("Error:", error));