import Prism from 'prismjs';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism.css';
import 'prismjs/themes/prism-okaidia.css';
import { Copy } from 'lucide-react';

// CODE LANGUAGE SUPPORT
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-protobuf';
import 'prismjs/components/prism-http';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-vim';
import 'prismjs/components/prism-makefile';
import 'prismjs/components/prism-latex';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-erlang';
import 'prismjs/components/prism-elm';
import 'prismjs/components/prism-haskell';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-lisp';
import 'prismjs/components/prism-clojure';
import 'prismjs/components/prism-scala';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-coffeescript';
import 'prismjs/components/prism-livescript';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-graphql';


type ParsedElement = {
    original: RegExp;
    parsed: string | ((match: string, ...groups: any[]) => string);
};

(function (Prism) {
    var tokenize = Prism.tokenize;
    Prism.tokenize = function (text, grammar) {
        var tokens = tokenize.call(this, text, grammar);

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (typeof token === 'string') {
                tokens.splice(i, 1, new Prism.Token('plain-text', token, [], token));
            }
        }

        return tokens;
    };
}(Prism));

export const parseMarkdown = (markdown: string): string => {
    let codeBlocks: {language: string, code: string}[] = [];
    let latexBlocks: string[] = [];
    
    // Extract code blocks
    markdown = markdown.replace(/```(\w+)?\s*([\s\S]*?)```/g, (_, language, match) => {
        codeBlocks.push({language: language || 'plaintext', code: match});
        return '\0';
    });

    // Extract LaTeX blocks
    markdown = markdown.replace(/\$\$(.+?)\$\$/g, (_, match) => {
        latexBlocks.push(match);
        return '\x01';
    });

    // Extract LaTeX block math using \[ ... \]
    markdown = markdown.replace(/\\\[(.+?)\\\]/g, (_, match) => {
        latexBlocks.push(match);
        return '\x01';
    });

    // Extract inline LaTeX using \( ... \)
    markdown = markdown.replace(/\\\((.+?)\\\)/g, (_, match) => {
        latexBlocks.push(match);
        return '\x02';
    });

    const elements: ParsedElement[] = [
        {original: /(?<!\S)###### (.*)/g, parsed: '<h6>$1</h6>'},
        {original: /(?<!\S)##### (.*)/g, parsed: '<h5>$1</h5>'},
        {original: /(?<!\S)#### (.*)/g, parsed: '<h4>$1</h4>'},
        {original: /(?<!\S)### (.*)/g, parsed: '<h3>$1</h3>'},
        {original: /(?<!\S)## (.*)/g, parsed: '<h2>$1</h2>'},
        {original: /(?<!\S)# (.*)/g, parsed: '<h1>$1</h1>'},
        {original: /(?<!\S)\*\*(.*)\*\*/g, parsed: '<strong>$1</strong>'},
        {original: /(?<!\S)__(.*)__/g, parsed: '<strong>$1</strong>'},
        {original: /(?<!\S)\*(.*)\*/g, parsed: '<em>$1</em>'},
        {original: /(?<!\S)_(.*)_/g, parsed: '<em>$1</em>'},
        {original: /(?<!\S)!\[(.*?)\]\((.*?)\)/g, parsed: '<img src="$2" alt="$1">'},
        {original: /(?<!\S)\[(.*?)\]\((.*?)\)/g, parsed: '<a href="$2">$1</a>'},
        {original: /(?<!\S)`([^`]+)`/g, parsed: '<code>$1</code>'},
        {
            original: /^> (.*)/gm,
            parsed: '<blockquote>$1</blockquote>'
        },
        {
            original: /(?<!\S)(?:^- (.*)(?:\n|$))+/gm,
            parsed: (match) => '<ul>' + match.split('\n').map(item => item ? `<li>-> ${item.slice(2)}</li>` : '').join('') + '</ul>'
        },
        {
            original: /(?<!\S)(?:^\d+\. (.*)(?:\n|$))+/gm,
            parsed: (match) => '<ol>' + match.split('\n').map((item) => item ? `<li>-> ${item.slice(3)}</li>` : '').join('') + '</ol>'
        },
        {original: /(?<!\S)\n/g, parsed: '<br>'},
        // LaTeX inline math
        {
            original: /(?<!\S)\$(.+?)\$/g,
            parsed: (match, latex) => katex.renderToString(latex, {throwOnError: false})
        },
    ];

    // Apply replacements
    markdown = elements.reduce((acc, element) => {
        return acc.replace(element.original, (match, ...args) => {
            if (typeof element.parsed === 'function') {
                return element.parsed(match, ...args);
            }
            return element.parsed.replace('$1', args[0]).replace('$2', args[1]);
        });
    }, markdown);

    // Process code blocks
    codeBlocks.forEach((block, index) => {
        let highlightedCode; 
        try {
            highlightedCode = Prism.highlight(block.code, Prism.languages[block.language], block.language);
        } catch (error) { 
            highlightedCode = Prism.highlight(block.code, Prism.languages.plaintext, 'plaintext')
        }
        
        const codeBlockHTML = `
          <div class="code-block">
            <div class="code-header">
              <span class="language-id">${block.language.charAt(0).toUpperCase() + block.language.slice(1)}</span>
              <button class="copy-btn" data-code-id="code-${index}">

              </button>
            </div>
            <pre><code id="code-${index}" class="language-${block.language} data-code-id">${highlightedCode}</code></pre>
          </div>
        `;

        markdown = markdown.replace('\0', codeBlockHTML);
    });

    // Process LaTeX blocks
    latexBlocks.forEach((latex, index) => {
        const latexHTML = `
          <div class="latex-block">
            ${katex.renderToString(latex, { throwOnError: false, displayMode: true })}
          </div>
        `;
        markdown = markdown.replace('\x01', latexHTML);
    });

    // Process inline LaTeX
    latexBlocks.forEach((latex, index) => {
        const latexHTML = katex.renderToString(latex, { throwOnError: false });
        markdown = markdown.replace('\x02', latexHTML);
    });

    return markdown;
};