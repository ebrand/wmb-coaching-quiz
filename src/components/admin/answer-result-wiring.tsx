'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import type { Answer, AnswerResultWeight, QuizResult } from '@/types/database';

interface AnswerResultWiringProps {
  answers: (Answer & { answer_result_weights: AnswerResultWeight[] })[];
  results: QuizResult[];
  onDeleteAnswer: (answerId: string) => void;
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function getResultColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function truncateText(text: string, max = 35): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

interface AnchorPoint {
  x: number;
  y: number;
}

export function AnswerResultWiring({ answers, results, onDeleteAnswer }: AnswerResultWiringProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const answerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const resultRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [, forceUpdate] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ answerId: string; cursorPos: AnchorPoint } | null>(null);
  const [loading, setLoading] = useState(false);

  // Force re-render when layout changes so SVG lines reposition
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      forceUpdate((n) => n + 1);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Also recalculate on answer/result changes
  useEffect(() => {
    forceUpdate((n) => n + 1);
  }, [answers, results]);

  const getAnchorPoint = useCallback(
    (element: HTMLDivElement | undefined, side: 'right' | 'left'): AnchorPoint | null => {
      if (!element || !containerRef.current) return null;
      const containerRect = containerRef.current.getBoundingClientRect();
      const elRect = element.getBoundingClientRect();
      return {
        x: side === 'right' ? elRect.right - containerRect.left : elRect.left - containerRect.left,
        y: elRect.top + elRect.height / 2 - containerRect.top,
      };
    },
    []
  );

  const handleCreateMapping = async (answerId: string, resultId: string) => {
    setLoading(true);
    try {
      // Find existing mapping for this answer
      const answer = answers.find((a) => a.id === answerId);
      const existingWeight = answer?.answer_result_weights[0];

      // Remove old mapping if it exists and points to a different result
      if (existingWeight && existingWeight.result_id !== resultId) {
        await fetch(
          `/api/answer-weights?answer_id=${answerId}&result_id=${existingWeight.result_id}`,
          { method: 'DELETE' }
        );
      }

      // If same result, skip (already mapped)
      if (existingWeight?.result_id === resultId) {
        setLoading(false);
        return;
      }

      // Create new mapping
      await fetch('/api/answer-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer_id: answerId,
          result_id: resultId,
          weight: 1,
        }),
      });

      router.refresh();
    } catch (error) {
      console.error('Error creating mapping:', error);
      alert('Failed to update mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMapping = async (answerId: string, resultId: string) => {
    setLoading(true);
    try {
      await fetch(`/api/answer-weights?answer_id=${answerId}&result_id=${resultId}`, {
        method: 'DELETE',
      });
      router.refresh();
    } catch (error) {
      console.error('Error removing mapping:', error);
      alert('Failed to remove mapping');
    } finally {
      setLoading(false);
    }
  };

  // Pointer handlers for drag interaction
  const handleAnswerPointerDown = (answerId: string, e: React.PointerEvent) => {
    // Only left click
    if (e.button !== 0) return;
    e.preventDefault();

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setDragging({
      answerId,
      cursorPos: {
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
      },
    });
    setSelectedAnswerId(null);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      setDragging((prev) =>
        prev
          ? {
              ...prev,
              cursorPos: {
                x: e.clientX - containerRect.left,
                y: e.clientY - containerRect.top,
              },
            }
          : null
      );
    },
    [dragging]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;

      // Check if pointer is over a result element
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target) {
        const resultEl = target.closest('[data-result-id]') as HTMLElement | null;
        if (resultEl) {
          const resultId = resultEl.dataset.resultId;
          if (resultId) {
            handleCreateMapping(dragging.answerId, resultId);
          }
        }
      }

      setDragging(null);
    },
    [dragging]
  );

  // Click-click interaction
  const handleAnswerClick = (answerId: string) => {
    if (dragging) return; // Don't trigger click during drag
    if (selectedAnswerId === answerId) {
      setSelectedAnswerId(null);
    } else {
      setSelectedAnswerId(answerId);
    }
  };

  const handleResultClick = (resultId: string) => {
    if (selectedAnswerId) {
      handleCreateMapping(selectedAnswerId, resultId);
      setSelectedAnswerId(null);
    }
  };

  // Callback refs for answer elements
  const setAnswerRef = useCallback((answerId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      answerRefs.current.set(answerId, el);
    } else {
      answerRefs.current.delete(answerId);
    }
  }, []);

  const setResultRef = useCallback((resultId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      resultRefs.current.set(resultId, el);
    } else {
      resultRefs.current.delete(resultId);
    }
  }, []);

  // Build connection lines data
  const connections: {
    answerId: string;
    resultId: string;
    from: AnchorPoint;
    to: AnchorPoint;
    color: string;
  }[] = [];

  for (const answer of answers) {
    const weight = answer.answer_result_weights[0];
    if (!weight) continue;

    const resultIndex = results.findIndex((r) => r.id === weight.result_id);
    if (resultIndex === -1) continue;

    const from = getAnchorPoint(answerRefs.current.get(answer.id), 'right');
    const to = getAnchorPoint(resultRefs.current.get(weight.result_id), 'left');

    if (from && to) {
      connections.push({
        answerId: answer.id,
        resultId: weight.result_id,
        from,
        to,
        color: getResultColor(resultIndex),
      });
    }
  }

  // Dragging line
  let dragLine: { from: AnchorPoint; to: AnchorPoint } | null = null;
  if (dragging) {
    const from = getAnchorPoint(answerRefs.current.get(dragging.answerId), 'right');
    if (from) {
      dragLine = { from, to: dragging.cursorPos };
    }
  }

  // Result color map for answer dot indicators
  const resultColorMap = new Map<string, string>();
  results.forEach((r, i) => resultColorMap.set(r.id, getResultColor(i)));

  if (answers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No answers yet. Add answers for this question.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* SVG overlay for connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        {connections.map((conn) => {
          const dx = conn.to.x - conn.from.x;
          const cp = Math.max(Math.abs(dx) * 0.4, 40);
          const d = `M ${conn.from.x} ${conn.from.y} C ${conn.from.x + cp} ${conn.from.y}, ${conn.to.x - cp} ${conn.to.y}, ${conn.to.x} ${conn.to.y}`;
          return (
            <g key={`${conn.answerId}-${conn.resultId}`}>
              {/* Fat invisible hit area for clicking */}
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                className="pointer-events-auto cursor-pointer"
                onClick={() => handleRemoveMapping(conn.answerId, conn.resultId)}
              />
              {/* Visible line */}
              <path
                d={d}
                fill="none"
                stroke={conn.color}
                strokeWidth={2.5}
                strokeOpacity={0.8}
              />
            </g>
          );
        })}

        {/* Dragging line */}
        {dragLine && (() => {
          const dx = dragLine.to.x - dragLine.from.x;
          const cp = Math.max(Math.abs(dx) * 0.4, 40);
          const d = `M ${dragLine.from.x} ${dragLine.from.y} C ${dragLine.from.x + cp} ${dragLine.from.y}, ${dragLine.to.x - cp} ${dragLine.to.y}, ${dragLine.to.x} ${dragLine.to.y}`;
          return (
            <path
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="6 4"
              className="text-muted-foreground"
            />
          );
        })()}
      </svg>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_1fr] gap-16" style={{ position: 'relative', zIndex: 2 }}>
        {/* Left column: Answers */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Answers
          </h4>
          {answers.map((answer) => {
            const weight = answer.answer_result_weights[0];
            const isSelected = selectedAnswerId === answer.id;
            const isDraggingThis = dragging?.answerId === answer.id;
            const mappedColor = weight ? resultColorMap.get(weight.result_id) : undefined;

            return (
              <div
                key={answer.id}
                ref={setAnswerRef(answer.id)}
                className={`border rounded-lg p-2.5 pr-2 bg-white flex items-center gap-2 transition-shadow ${
                  isSelected
                    ? 'ring-2 ring-primary shadow-md'
                    : isDraggingThis
                      ? 'ring-2 ring-primary/50 shadow-sm'
                      : 'hover:shadow-sm'
                }`}
                style={{ cursor: loading ? 'wait' : 'grab' }}
                onPointerDown={(e) => handleAnswerPointerDown(answer.id, e)}
                onClick={() => handleAnswerClick(answer.id)}
              >
                {/* Color dot indicator for mapped answers */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: mappedColor || 'var(--muted)',
                    opacity: mappedColor ? 1 : 0.4,
                  }}
                />
                <span className="flex-1 text-sm font-medium">{truncateText(answer.answer_text)}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {weight && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMapping(answer.id, weight.result_id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAnswer(answer.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column: Results */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Results
          </h4>
          {results.map((result, index) => {
            const color = getResultColor(index);
            // Count how many answers map to this result
            const mappedCount = answers.filter((a) =>
              a.answer_result_weights.some((w) => w.result_id === result.id)
            ).length;

            return (
              <div
                key={result.id}
                ref={setResultRef(result.id)}
                data-result-id={result.id}
                className={`border rounded-lg p-2.5 flex items-center gap-2 transition-shadow ${
                  selectedAnswerId
                    ? 'hover:ring-2 hover:ring-primary hover:shadow-md cursor-pointer'
                    : dragging
                      ? 'hover:ring-2 hover:ring-primary hover:shadow-md'
                      : ''
                }`}
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: color,
                  backgroundColor: 'white',
                }}
                onClick={() => handleResultClick(result.id)}
              >
                <span className="flex-1 text-sm font-medium">{truncateText(result.title)}</span>
                {mappedCount > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: color,
                      color: 'white',
                      opacity: 0.85,
                    }}
                  >
                    {mappedCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions hint */}
      {selectedAnswerId && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Click a result to connect, or click the answer again to cancel.
        </p>
      )}
    </div>
  );
}
