// src/components/TurnList.tsx
'use client'

import { useMemo, useState } from 'react'
import { Turn, Model } from '@/lib/types'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TurnListProps {
  turns: Turn[]
  models: Model[]
}

const TRUNCATE_LIMIT = 350;

const formatCost = (cost: number) => {
  if (cost < 0.000001 && cost > 0) return "<$0.000001";
  if (cost === 0) return "$0.00";
  return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`;
}

export function TurnList({ turns, models }: TurnListProps) {
  const modelMap = useMemo(() => new Map(models.map(m => [m.name, m])), [models])
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());

  const toggleExpand = (turnId: number) => {
    setExpandedTurns(prev => {
        const newSet = new Set(prev);
        if (newSet.has(turnId)) {
            newSet.delete(turnId);
        } else {
            newSet.add(turnId);
        }
        return newSet;
    });
  };

  const turnsWithCosts = useMemo(() => {
    const result: (Turn & { cost: number; contextTokens: number })[] = [];
    let cumulativeInputTokens = 0
    let cumulativeOutputTokens = 0

    turns.forEach((turn) => {
      const model = modelMap.get(turn.model)
      const contextTokens = cumulativeInputTokens + cumulativeOutputTokens
      const turnInputTokens = turn.input_tokens || 0
      const turnOutputTokens = turn.output_tokens || 0
      
      let totalTurnCost = 0;

      if (model) {
        // Calculate cost for this turn's context
        let contextCost = 0
        if (contextTokens > 0) {
          const contextCostPerToken = (model.isCacheEnabled ? model.cachedInputCost : model.inputCost) / 1_000_000;
          contextCost = contextTokens * contextCostPerToken;
        }

        // Calculate cost for this turn's own I/O
        const turnInputCost = turnInputTokens * (model.inputCost / 1_000_000)
        const turnOutputCost = turnOutputTokens * (model.outputCost / 1_000_000)

        totalTurnCost = contextCost + turnInputCost + turnOutputCost
      }
      
      // Update cumulative tokens for the *next* turn
      cumulativeInputTokens += turnInputTokens
      cumulativeOutputTokens += turnOutputTokens

      result.push({ ...turn, cost: totalTurnCost, contextTokens });
    });
    return result;
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
      {turnsWithCosts.map((turn, index) => {
        const isLongContent = turn.content.length > TRUNCATE_LIMIT;
        const isExpanded = expandedTurns.has(turn.id);

        return (
          <Card key={turn.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Turn {index + 1}: {turn.model}</CardTitle>
                <Badge variant="secondary">{new Date(turn.timestamp).toLocaleString()}</Badge>
              </div>
              <div className="pt-2">
                <CardDescription className="whitespace-pre-wrap break-words">
                  {isLongContent && !isExpanded
                    ? `${turn.content.substring(0, TRUNCATE_LIMIT)}...`
                    : turn.content
                  }
                </CardDescription>
                {isLongContent && (
                  <Button
                    variant="link"
                    className="h-auto p-0 mt-2 justify-start text-primary"
                    onClick={() => toggleExpand(turn.id)}
                  >
                    {isExpanded ? 'Read Less' : 'Read More'}
                  </Button>
                )}
              </div>
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
        )
      })}
    </div>
  )
}