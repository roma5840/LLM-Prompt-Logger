// src/components/TurnList.tsx
'use client'

import { useMemo } from 'react'
import { Turn, Model } from '@/lib/types'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TurnListProps {
  turns: Turn[]
  models: Model[]
}

const formatCost = (cost: number) => {
  if (cost < 0.000001 && cost > 0) return "<$0.000001";
  if (cost === 0) return "$0.00";
  return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`;
}

export function TurnList({ turns, models }: TurnListProps) {
  const modelMap = useMemo(() => new Map(models.map(m => [m.name, m])), [models])

  const turnsWithCosts = useMemo(() => {
    let cumulativeInputTokens = 0
    let cumulativeOutputTokens = 0

    return turns.map((turn) => {
      const model = modelMap.get(turn.model)
      if (!model) return { ...turn, cost: 0, contextTokens: 0 }

      const contextTokens = cumulativeInputTokens + cumulativeOutputTokens
      
      const turnInputTokens = turn.input_tokens || 0
      const turnOutputTokens = turn.output_tokens || 0

      // Calculate cost for this turn's context
      let contextCost = 0
      if (contextTokens > 0) {
        const contextCostPerToken = model.inputCost / 1_000_000
        if (model.isCacheEnabled) {
          const discountMultiplier = 1 - (model.cacheDiscount / 100)
          contextCost = contextTokens * contextCostPerToken * discountMultiplier
        } else {
          contextCost = contextTokens * contextCostPerToken
        }
      }

      // Calculate cost for this turn's own I/O
      const turnInputCost = turnInputTokens * (model.inputCost / 1_000_000)
      const turnOutputCost = turnOutputTokens * (model.outputCost / 1_000_000)

      const totalTurnCost = contextCost + turnInputCost + turnOutputCost
      
      // Update cumulative tokens for the *next* turn
      cumulativeInputTokens += turnInputTokens
      cumulativeOutputTokens += turnOutputTokens

      return { ...turn, cost: totalTurnCost, contextTokens }
    })
  }, [turns, modelMap])

  if (turns.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">No turns logged in this conversation yet.</p>
        <p className="text-sm text-muted-foreground">Use the form below to log the first turn.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {turnsWithCosts.map((turn, index) => (
        <Card key={turn.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">Turn {index + 1}: {turn.model}</CardTitle>
              <Badge variant="secondary">{new Date(turn.timestamp).toLocaleString()}</Badge>
            </div>
            <CardDescription className="whitespace-pre-wrap break-words pt-2">{turn.content}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between text-sm">
            <div className="text-muted-foreground">
              <span>Context: <span className="font-mono">{turn.contextTokens.toLocaleString()}</span></span>
              <span className="mx-2">|</span>
              <span>Input: <span className="font-mono">{turn.input_tokens?.toLocaleString() ?? 'N/A'}</span></span>
              <span className="mx-2">|</span>
              <span>Output: <span className="font-mono">{turn.output_tokens?.toLocaleString() ?? 'N/A'}</span></span>
            </div>
            <div className="font-semibold">
              Turn Cost: {formatCost(turn.cost)}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}