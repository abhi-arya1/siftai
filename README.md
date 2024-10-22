<div align="center">
    <img width="400" alt="Screenshot 2024-10-20 at 10 47 30 AM" src="https://github.com/user-attachments/assets/b6581642-d9cf-41ca-b484-40c680d2c1c2">
    <h1>Sift</h1>
    <h3><i>Search everything, find anything</i></h3>
    <span><a href="https://devpost.com/software/sift-8sgr4f">Calhacks 11.0 Submission</a></span>
</div>

## Inspiration
As students and tech enthusiasts, we use many different platforms day-to-day, oftentimes completing a wide range of tasks while also expanding our digital footprints and knowledge bases. With this resourcefulness arises a problem: Wasting time combing through different platforms with the faintest idea of where something might be, opening a plethora of different tabs, or distributing information to pesky paid services. Managing everything from midterm season to hackathon deadlines, to finding the perfect photograph, and wasting time by searching your work is what Sift aims to combat.

## What it does
Sift allows you to simultaneously search files in your filesystem, GitHub, Notion, Slack, Discord, and the Google Suite, simply with natural language. You can view your files directly in Sift's interface, and get a specialized summary in real-time based on the context of your query, with the power of Groq, streamlining your workflow.

## How we built it
Sift uses the Tauri framework to bundle together a robust Rust-based backend with a Next.js/React frontend, running an optimized build for either Mac or Windows natively. By powering all of our services through Rust, we're able to maintain blazingly fast real-time search speeds while maintaining familiarity with the frontend. Using Rust, we also integrate with multiple OAuth APIs over Sockets, and run a wrapped version of ChromaDB through our backend, allowing us to contain every service entirely on-device with a custom set of Python bindings. By using Chroma, we're able to use natural language to simultaneously query multiple knowledge bases (with Multimodal Embeddings) for relevant data, returning the most confident results to the user. Upon that, Groq generates instant inference to speed up your search, and you can preview files with Rust and Next.js bindings through Tauri.

## Challenges we ran into
- OAuth Integrations on the Desktop / In Rust
- Lack of Browser APIs in the Tauri Environment
- Building for Cross-Platform Compatability
- Using Inference to determine Actionable Files
- Querying hundreds of thousands of files in seconds

## Accomplishments that we're proud of
- Learning Rust from start to finish.
- Learning Vector Databases, including embeddings and metadata
- Building our first end-to-end Desktop App
- Containing everything on-device for security and efficiency

## What we learned
Rust 🦀
- Desktop App Development
- Vector Databases
- Binding Rust, Python, and TypeScript SDKs simultaneously
- How to Sleep during a Hackathon

## What's next for Sift
In the future, we plan to add inference functionality that suggests actions to take in real-time, such as managing calendar events, starting a note, or running code processes. Also, implementing focus-based search is something that really intrigues us as we look forward in Sift's journey, and specializing the platform's tools for different knowledge bases can empower your workflow with Sift even further.
