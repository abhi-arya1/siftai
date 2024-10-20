import React, { useState, useRef, useEffect } from "react";
import { Groq } from "groq-sdk";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBoxProps {
  onSearch: (query: string) => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch }) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Setup the Groq client
  const client = new Groq({
    apiKey: "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",
    dangerouslyAllowBrowser: true,
  });

  const generateSuggestion = async (text: string) => {
    if (!text.trim()) {
      setSuggestion("");
      return;
    }

    try {
      const chatCompletion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant guiding users in their search through their files and integrations using natural language. DO NOT TRY TO CONVERSE WITH USERS THROUGH THE CONVERSATION. SIMPLY Provide concise, one-liner completions for the search context. DO NOT INCLUDE QUOTION MARKS, AND DO NOT PROVIDE THE BEGINNING PORTION OF THE PHRASE, SIMPLY PROVIDE THE MISSING WORDS IN THE ONE-LINER PHRASE SUGGESTION TO CONCATENATE TO THE END OF THE USER'S ALREADY TYPED WORD(S). Make sure the suggestions you provide are NOT just one or two words, but rather complete, but still concise.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        model: "llama3-8b-8192",
      });

      const suggestedCompletion =
        chatCompletion.choices[0]?.message.content || "";

      // Clip suggestion to a single line that fits within the input
      setSuggestion(suggestedCompletion.split("\n")[0].trim());
    } catch (error) {
      console.error("Error fetching suggestion:", error);
      setSuggestion("");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue.trim().length > 2) {
        generateSuggestion(inputValue);
      } else {
        // Clear suggestion if no user-entered text is present
        setSuggestion("");
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      const newValue = inputValue + suggestion;
      setInputValue(newValue);
      setSuggestion("");
      onSearch(newValue);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className="relative flex-1">
      <Search className="absolute z-[10000000] left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-4 dark:bg-zinc-800 dark:border-zinc-700 bg-zinc-50 border-zinc-200 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-0 focus:border-zinc-200 dark:focus:border-zinc-700"
          placeholder="Search everything..."
        />
        {suggestion && (
          <div
            className="absolute left-0 top-0 w-full h-full flex items-center pointer-events-none"
            style={{ paddingLeft: "2.25rem" }}
          >
            <span className="text-zinc-900 dark:text-zinc-100 opacity-0">
              {inputValue}
            </span>
            <span className="text-zinc-400/50 text-[14px]">{suggestion}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBox;
