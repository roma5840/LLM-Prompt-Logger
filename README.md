<div align="center">
  <img src="./public/favicon.svg" alt="PromptLog Logo" width="80">
  <h1>PromptLog</h1>
  <p>A sleek, local-first, privacy-focused, and E2EE sync-enabled tool for logging and analyzing your LLM prompts.</p>
</div>

<div align="center">
  <a href="https://promptlog.romaquino.com">
    <img src="https://img.shields.io/badge/Live%20Demo-promptlog.romaquino.com-brightgreen?style=for-the-badge&logo=vercel" alt="Live Demo"/>
  </a>
  <img src="https://img.shields.io/github/license/roma5840/LLM-Prompt-Logger?style=for-the-badge" alt="License"/>
</div>

## About

**PromptLog** is a modern web application designed to help developers, researchers, and AI enthusiasts track and analyze their interactions with Large Language Models (LLMs). It starts as a completely private, browser-based tool and offers a seamless one-click migration to a secure, **end-to-end encrypted** cloud backend for real-time data synchronization across multiple devices.

Your privacy is paramount. With E2EE, your prompt data is encrypted on your device using a master password only you know, making it unreadable to the server and anyone else.

## Key Features

*   **Local-First & Private**: Your data stays on your device by default using your browser's local storage. No account is needed to get started.
*   **Optional E2EE Cloud Sync**: Enable cloud sync with a master password. Your data is encrypted on your device via the Web Crypto API before being sent to the cloud. An in-app explanation clearly shows what data is and isn't visible to the server, ensuring full transparency.
*   **Seamless Device Linking**: Easily link a new device to your cloud account by scanning a QR code or entering the sync key manually.
*   **Insightful Dashboard**: Visualize your prompt history with stats on total usage, daily activity, token counts, and a breakdown of which models you use most frequently.
*   **Conflict Resolution**: An intelligent migration assistant helps resolve conflicts when local notes are too long for encrypted sync, ensuring a smooth transition to the cloud.
*   **Token Tracking & Calculation**: Log output tokens for your prompts, or paste the LLM's output to get an estimated token count.
*   **Data Portability**: Full control over your data. Export your entire decrypted prompt history to a JSON file and import it back at any time, whether you're using local or cloud storage.
*   **Custom Model Management**: The default models are just a starting point. Add, remove, and manage your own list of custom model names.
*   **Built-in FAQ**: A dedicated FAQ page answers common user questions about privacy, data management, and app features.
*   **Responsive Design**: A seamless experience on desktop, tablet, and mobile devices.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn/ui](https://ui.shadcn.com/) (built on Radix UI & CVA)
-   **Security**: [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) for End-to-End Encryption (AES-GCM).
-   **Backend & DB**: [Supabase](https://supabase.io/) (for optional E2EE sync, database, and real-time updates)
-   **State Management**: React Context (`useContext` and `useState`)
-   **Data Visualization**: [Recharts](https://recharts.org/)
-   **QR Code Handling**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) & [qrcode](https://github.com/soldair/node-qrcode)
-   **Theme Management**: [next-themes](https://github.com/pacocoursey/next-themes)
-   **Analytics**: [Vercel Analytics](https://vercel.com/analytics)
-   **Deployment**: [Vercel](https://vercel.com/)

## Getting Started / Local Development

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/)
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

3.  **Set up environment variables (Optional):**

    Create a file named `.env.local` in the root of the project. These variables are only required if you want to test the cloud sync functionality.

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
│   │   ├── faq
│   │   │   └── page.tsx
│   │   ├── settings
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── ui
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── ... (and 30+ other UI components)
│   │   ├── E2EEExplanation.tsx
│   │   ├── MainLayout.tsx
│   │   ├── MigrationConflictResolver.tsx
│   │   ├── PromptList.tsx
│   │   ├── PromptLogger.tsx
│   │   ├── Stats.tsx
│   │   ├── theme-provider.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── Welcome.tsx
│   ├── hooks
│   │   ├── use-data.tsx
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   └── lib
│       ├── constants.ts
│       ├── crypto.ts
│       ├── supabase.ts
│       ├── types.ts
│       └── utils.ts
├── apphosting.yaml
├── components.json
├── LICENSE
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