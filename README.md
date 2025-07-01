<div align="center">
  <img src="./public/favicon.svg" alt="PromptLog Logo" width="80">
  <h1>PromptLog</h1>
  <p>A sleek, local-first, and sync-enabled tool for logging and analyzing your LLM prompts.</p>
</div>

<div align="center">
  <a href="https://promptlog.romaquino.com">
    <img src="https://img.shields.io/badge/Live%20Demo-promptlog.romaquino.com-brightgreen?style=for-the-badge&logo=vercel" alt="Live Demo"/>
  </a>
  <img src="https://img.shields.io/github/license/roma5840/LLM-Prompt-Logger?style=for-the-badge&cacheSeconds=1" alt="License"/>
</div>

## About

**PromptLog** is a modern web application designed to help developers, researchers, and AI enthusiasts track and analyze their interactions with Large Language Models (LLMs). It starts as a completely private, browser-based tool and offers a seamless one-click migration to a secure cloud backend for data synchronization across multiple devices.

Whether you're fine-tuning prompts, comparing model outputs, or simply keeping a record of your AI conversations, PromptLog provides the essential tools in a clean, intuitive, and responsive interface.

## Key Features

*   **Effortless Prompt Logging**: Quickly log prompt notes, select the model used, and let the app handle the rest.
*   **Insightful Dashboard**: Visualize your prompt history with stats on total usage, daily activity, and a breakdown of which models you use most frequently.
*   **Local-First Storage**: Your data stays on your device by default, using your browser's local storage. No account needed to get started.
*   **Optional Cloud Sync**: With a single click, migrate your data to a secure Supabase backend. This generates a unique sync key, allowing you to access and update your data from any device.
*   **QR Code Device Linking**: Easily link a new device to your cloud account by scanning a QR code—no need to manually type long keys.
*   **Data Portability**: Full control over your data. Export your entire prompt history to a JSON file and import it back at any time, whether you're using local or cloud storage.
*   **Custom Model Management**: The default models are just a starting point. Add, remove, and manage your own list of custom model names.
*   **Responsive Design**: A seamless experience on desktop, tablet, and mobile devices.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn/ui](https://ui.shadcn.com/) (built on Radix UI & CVA)
-   **Backend & DB**: [Supabase](https://supabase.io/) (for optional cloud sync)
-   **State Management**: React Context (`useContext`)
-   **Data Visualization**: [Recharts](https://recharts.org/)
-   **Deployment**: [Vercel](https://vercel.com/)

## Getting Started / Local Development

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18.0 or later)
-   [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/roma5840/LLM-Prompt-Logger.git
    cd LLM-Prompt-Logger
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a file named `.env.local` in the root of the project and add your Supabase credentials. These are only required if you want to test the cloud sync functionality.

    ```env
    # .env.local

    # Get these from your Supabase project settings > API
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```
    > **Note:** The app will work perfectly in local-only mode without this file.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

<details>
<summary>Click to view the project structure</summary>

```
LLM-Prompt-Logger/
├── docs
│   └── blueprint.md
├── public
│   └── favicon.svg
├── src
│   ├── ai
│   │   ├── dev.ts
│   │   └── genkit.ts
│   ├── app
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── ui/
│   │   ├── MainLayout.tsx
│   │   ├── ModelManager.tsx
│   │   ├── PromptList.tsx
│   │   ├── PromptLogger.tsx
│   │   ├── Stats.tsx
│   │   └── theme-provider.tsx
│   ├── hooks
│   │   ├── use-data.tsx
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   └── lib
│       ├── constants.ts
│       ├── supabase.ts
│       ├── types.ts
│       └── utils.ts
├── apphosting.yaml
├── components.json
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
└── tsconfig.json
```

</details>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.