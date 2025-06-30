'use client'

import { useData } from '@/hooks/use-data'
import { Stats } from '@/components/Stats'
import { PromptLogger } from '@/components/PromptLogger'
import { FilterControls } from '@/components/FilterControls'
import { PromptList } from '@/components/PromptList'
import { ModelManager } from '@/components/ModelManager'
import { Sidebar, SidebarContent } from '@/components/ui/sidebar'

export default function Home() {
  const data = useData()

  return (
    <>
      <Sidebar>
        <SidebarContent>
          <PromptLogger addPrompt={data.addPrompt} models={data.models} />
          <ModelManager
            models={data.models}
            updateUserModels={data.updateUserModels}
            syncKey={data.syncKey}
            migrateToCloud={data.migrateToCloud}
            linkDeviceWithKey={data.linkDeviceWithKey}
            handleExportData={data.handleExportData}
            handleImportData={data.handleImportData}
          />
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 p-4 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <Stats history={data.history} models={data.models} />
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Prompt History</h2>
          <FilterControls />
          <PromptList
            loading={data.loading}
            history={data.history}
            deletePrompt={data.deletePrompt}
            updatePromptNote={data.updatePromptNote}
          />
        </div>
      </main>
    </>
  )
}
