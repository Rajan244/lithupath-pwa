import { useState, useEffect } from 'react';
import { db, type CourseItem } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { Check } from 'lucide-react';

interface TokenInfo {
  raw: string;
  clean: string;
  match?: CourseItem;
  known: boolean;
}

export default function WordBreakdown({ ltText }: { ltText: string }) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);

  // Split by spaces, keep punctuation attached to the raw token but stripped for lookup
  useEffect(() => {
    const rawTokens = ltText.split(/\s+/).filter(Boolean);
    const initialTokens = rawTokens.map(raw => {
      // Remove basic punctuation for lookup
      const clean = raw.replace(/[.,!?";:()[\]{}]/g, '').toLowerCase();
      return { raw, clean, known: false };
    });
    setTokens(initialTokens);
  }, [ltText]);

  const allItems = useLiveQuery(() => db.course_items.toArray());
  const allProgress = useLiveQuery(() => db.user_item_progress.where('user_id').equals('local_user').toArray());

  useEffect(() => {
    if (!allItems || !allProgress || tokens.length === 0) return;

    // Only update if we haven't done the lookup yet (simple check)
    if (tokens.some(t => t.match !== undefined)) return;

    const progressMap = new Map(allProgress.map(p => [p.item_id, p]));
    
    // Find exact matches in lt (case insensitive)
    const updated = tokens.map(token => {
      // Find the best match
      const match = allItems.find(item => 
        item.lt.toLowerCase() === token.clean && item.type === 'word'
      );

      let known = false;
      if (match) {
        const p = progressMap.get(match.item_id);
        // "known" if score is at least 5 (medium/strong/mastered)
        if (p && p.score >= 5) {
          known = true;
        }
      }

      return { ...token, match, known };
    });

    setTokens(updated);

  }, [allItems, allProgress, tokens]);

  if (tokens.length <= 1) return null; // Don't show breakdown for single words

  return (
    <div className="w-full mt-6 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
      <h4 className="text-xs font-bold text-text/40 uppercase tracking-wider mb-3">Word Breakdown</h4>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token, idx) => (
          <div 
            key={idx}
            className={clsx(
              "px-3 py-2 rounded-xl border flex flex-col transition-colors",
              token.known 
                ? "bg-green-50 border-status-strong/30 text-status-strong" 
                : "bg-gray-50 border-gray-200 text-text/60"
            )}
          >
            <div className="flex items-center">
              <span className="font-bold text-sm">{token.raw}</span>
              {token.known && <Check className="w-3 h-3 ml-1.5 opacity-80" />}
            </div>
            {token.match && (
              <span className={clsx(
                "text-[10px] mt-0.5",
                token.known ? "font-medium opacity-90" : "font-normal opacity-70"
              )}>
                {token.match.en}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
