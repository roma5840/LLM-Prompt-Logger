'use client'

import { Lock, Server, Smartphone, User } from 'lucide-react'

export function E2EEExplanation() {
  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">The Core Idea: A Locked Box</h3>
        <p className="text-muted-foreground">
          Think of your data as valuables in a locked box. Your <span className="text-primary font-semibold">Master Password</span> is the only key. You lock the box before it ever leaves your house, and only you can unlock it. We just transport the locked box for you.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-foreground mb-4">How It Works: Step-by-Step</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-1">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-card-foreground">1. You Create a Master Password</p>
              <p className="text-muted-foreground">This password <span className="font-bold">never</span> leaves your device. It's used to generate a unique encryption key locally in your browser.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-1">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-card-foreground">2. Data is Encrypted on Your Device</p>
              <p className="text-muted-foreground">Before your prompt notes and token counts are saved, they are scrambled into unreadable ciphertext using your encryption key.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-1">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-card-foreground">3. Encrypted Data is Sent to the Cloud</p>
              <p className="text-muted-foreground">Only the scrambled, unreadable data is stored on our servers. We have no way to see its original content.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-1">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-card-foreground">4. Decryption on Your Other Devices</p>
              <p className="text-muted-foreground">When you link a new device, it downloads the encrypted data. You then enter your Master Password on that device to decrypt it locally.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 bg-green-500/5 border-green-500/20">
          <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
            What We CAN'T See
          </h3>
          <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
            <li>The content of your prompt notes</li>
            <li>Your input and output token counts</li>
            <li>Your Master Password</li>
          </ul>
        </div>
        <div className="rounded-lg border p-4 bg-amber-500/5 border-amber-500/20">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            What We CAN See
          </h3>
          <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
            <li>The model names you use and their configured costs</li>
            <li>The timestamp of each prompt</li>
            <li>One-way hashes of your password for verification (cannot be reversed to find your password)</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground pt-2">
        This minimal metadata is necessary for the app to function (e.g., sorting prompts and calculating costs) but does not expose your private content.
      </p>
    </div>
  )
}