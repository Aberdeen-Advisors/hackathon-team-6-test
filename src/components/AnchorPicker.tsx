'use client';

import { useState } from 'react';
import type { Dimension, Level } from '@/data/seed';
import { Button, inputCls } from '@/components/ui';

/**
 * A score is set by choosing a written anchor, never by typing an integer.
 * Selecting an anchor sets level + anchor label + anchor text atomically, which is why
 * a bare number is never a valid score in this product (PRD section 3.4).
 */
export function AnchorPicker({
  dimension, current, currentRationale, onSave, onClose,
}: {
  dimension: Dimension;
  current: Level | null;
  currentRationale: string;
  onSave: (level: Level, rationale: string) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<Level | null>(current);
  const [rationale, setRationale] = useState(currentRationale);

  return (
    <div className="w-[520px] max-w-[92vw]">
      <div className="mb-3">
        <div className="text-[13px] font-medium text-aberdeen">{dimension.name}</div>
        <div className="text-2xs text-onyx-60 mt-1 leading-relaxed">{dimension.prompt}</div>
        <div className="text-2xs text-onyx-40 mt-1.5">Weight in the composite score: {dimension.weight}</div>
      </div>

      <div className="space-y-1.5 max-h-[42vh] overflow-y-auto pr-1">
        {[...dimension.anchors].sort((a, b) => b.level - a.level).map((a) => {
          const sel = level === a.level;
          return (
            <button
              key={a.level} type="button" onClick={() => setLevel(a.level as Level)}
              className={`w-full text-left rounded border px-3 py-2.5 transition-colors ${
                sel ? 'border-verdigris bg-verdigris-50' : 'border-onyx-20 hover:border-aberdeen-200 hover:bg-aberdeen-50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-sm text-xs font-semibold ${
                  sel ? 'bg-aberdeen text-white' : 'bg-onyx-10 text-onyx'
                }`}>{a.level}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-aberdeen">{a.label}</span>
                  <span className="block text-2xs text-onyx-60 mt-0.5 leading-relaxed">{a.description}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <label className="block mt-4">
        <span className="block text-xs font-medium text-aberdeen mb-1.5">
          Rationale <span className="text-onyx-40 font-normal">(required)</span>
        </span>
        <textarea
          className={inputCls} rows={2} value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why this anchor, and what evidence supports it?"
        />
      </label>

      <div className="flex justify-end gap-2 mt-3">
        <Button size="sm" onClick={onClose}>Cancel</Button>
        <Button
          size="sm" variant="primary"
          disabled={level === null || rationale.trim().length < 3}
          onClick={() => level !== null && onSave(level, rationale.trim())}
        >
          Save score
        </Button>
      </div>
    </div>
  );
}
