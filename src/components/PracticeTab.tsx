import { useState, useEffect } from 'react';
import { Target, CheckCircle2, XCircle, Languages } from 'lucide-react';
import { db, type CourseItem } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

type Direction = 'en_to_lt' | 'lt_to_en';

type PracticeItem = {
  item: CourseItem;
  direction: Direction;
};

type Option = {
  text: string;    // displayed option
  reveal: string;  // revealed after answer (opposite language)
  isCorrect: boolean;
};

export default function PracticeTab() {
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const allItems = useLiveQuery(() => db.course_items.toArray());
  const allProgress = useLiveQuery(() => db.user_item_progress.where('user_id').equals('local_user').toArray());
  const settings = useLiveQuery(() => db.user_settings.get('local_user'));
  const currentDay = settings?.current_day || 1;
  const todayItems = useLiveQuery(() => db.course_items.where('day').equals(currentDay).toArray(), [currentDay]);

  // Step 1: Build the smart item list
  useEffect(() => {
    if (allItems && allItems.length > 0 && practiceItems.length === 0 && todayItems !== undefined) {
      const progressMap = new Map(allProgress?.map(p => [p.item_id, p]) || []);

      // Today's new unseen items
      const seenIds = new Set(allProgress?.map(p => p.item_id) || []);
      const todayNew = (todayItems || []).filter(i => !seenIds.has(i.item_id));

      // All weak items (score < 7) across all days, weakest first
      const weakItems = allItems.filter(i => {
        const p = progressMap.get(i.item_id);
        return p && p.score < 7;
      }).sort((a, b) => {
        const sa = progressMap.get(a.item_id)?.score ?? 0;
        const sb = progressMap.get(b.item_id)?.score ?? 0;
        return sa - sb;
      });

      // Merge: today's new first, then weak, dedup
      const seen = new Set<string>();
      const merged: CourseItem[] = [];
      for (const item of [...todayNew, ...weakItems]) {
        if (!seen.has(item.item_id)) {
          seen.add(item.item_id);
          merged.push(item);
        }
      }

      // Fallback for brand new users
      const base = merged.length > 0
        ? merged.slice(0, 5)
        : allItems.filter(i => !seenIds.has(i.item_id)).slice(0, 5);

      // Create BOTH directions for each item, then shuffle
      const bothDirections: PracticeItem[] = [];
      for (const item of base) {
        bothDirections.push({ item, direction: 'en_to_lt' });
        bothDirections.push({ item, direction: 'lt_to_en' });
      }
      // Shuffle so same item's two directions aren't back-to-back
      bothDirections.sort(() => 0.5 - Math.random());
      setPracticeItems(bothDirections);
    }
  }, [allItems, allProgress, todayItems, practiceItems.length]);

  // Step 2: Build options for current question based on direction
  useEffect(() => {
    if (practiceItems.length > 0 && currentIndex < practiceItems.length && allItems) {
      const { item: currentItem, direction } = practiceItems[currentIndex];

      const wrongItems = allItems
        .filter(i => i.item_id !== currentItem.item_id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      let newOptions: Option[];

      if (direction === 'en_to_lt') {
        // Show English → pick Lithuanian
        newOptions = [
          { text: currentItem.lt, reveal: currentItem.en, isCorrect: true },
          ...wrongItems.map(i => ({ text: i.lt, reveal: i.en, isCorrect: false }))
        ];
      } else {
        // Show Lithuanian → pick English
        newOptions = [
          { text: currentItem.en, reveal: currentItem.lt, isCorrect: true },
          ...wrongItems.map(i => ({ text: i.en, reveal: i.lt, isCorrect: false }))
        ];
      }

      setOptions(newOptions.sort(() => 0.5 - Math.random()));
      setSelectedOption(null);
    }
  }, [currentIndex, practiceItems, allItems]);

  const handleNext = async () => {
    if (selectedOption === null) return;

    const isCorrect = options[selectedOption].isCorrect;
    if (isCorrect) setScore(s => s + 1);

    // Update DB — wrong answer in EITHER direction marks as weak
    const currentItem = practiceItems[currentIndex].item;
    let progress = await db.user_item_progress.get({ item_id: currentItem.item_id, user_id: 'local_user' });

    if (progress) {
      if (isCorrect) {
        // If it was weak, jump it to medium (4) so it stops being considered weak.
        // If it was already medium or higher, add 2.
        progress.score = Math.max(4, Math.min(10, progress.score + 2));
      } else {
        // Any mistake drops it to 0 (weak)
        progress.score = 0;
      }
      progress.times_seen += 1;
      if (isCorrect) progress.times_correct += 1;
      else progress.times_wrong += 1;

      if (progress.score >= 10) progress.status = 'mastered';
      else if (progress.score >= 7) progress.status = 'strong';
      else if (progress.score >= 4) progress.status = 'medium';
      else progress.status = 'weak';

      await db.user_item_progress.put(progress);
    } else {
      const initialScore = isCorrect ? 4 : 0;
      await db.user_item_progress.put({
        user_id: 'local_user',
        item_id: currentItem.item_id,
        score: initialScore,
        status: isCorrect ? 'medium' : 'weak',
        times_seen: 1,
        times_correct: isCorrect ? 1 : 0,
        times_wrong: isCorrect ? 0 : 1,
        last_result: isCorrect ? 'correct' : 'wrong',
        last_seen_at: new Date().toISOString(),
        next_review_at: new Date().toISOString()
      });
    }

    if (currentIndex < practiceItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (!allItems) {
    return <div className="p-6 text-center">Loading quiz data...</div>;
  }

  if (isFinished) {
    const total = practiceItems.length;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="flex flex-col h-full px-6 pt-12 pb-6 relative max-w-lg mx-auto items-center justify-center text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Target className="w-10 h-10 text-status-strong" />
        </div>
        <h1 className="text-3xl font-display font-bold text-primary mb-2">Practice Complete!</h1>
        <p className="text-lg text-text/70 mb-2">You scored {score} out of {total}</p>
        <p className="text-3xl font-display font-bold text-accent mb-8">{pct}%</p>
        <button
          onClick={() => {
            setIsFinished(false);
            setPracticeItems([]);
            setCurrentIndex(0);
            setScore(0);
          }}
          className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-md w-full"
        >
          Practice Again
        </button>
      </div>
    );
  }

  if (practiceItems.length === 0) return null;

  const { item: currentItem, direction } = practiceItems[currentIndex];
  const isEnToLt = direction === 'en_to_lt';

  return (
    <div className="flex flex-col h-full px-6 pt-12 pb-6 relative max-w-lg mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-text/60 font-medium uppercase tracking-wider text-xs">Active Testing</h2>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center ${isEnToLt ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent'}`}>
            <Languages className="w-3 h-3 mr-1" />
            {isEnToLt ? 'EN → LT' : 'LT → EN'}
          </span>
        </div>
        <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full flex items-center">
          <Target className="w-3 h-3 mr-1" /> {currentIndex + 1}/{practiceItems.length}
        </span>
      </header>

      <div className="flex-1 flex flex-col justify-center mb-8 relative">
        <div className="text-center mb-8">
          <h3 className="text-text/60 text-sm font-bold uppercase tracking-wider mb-3">
            {isEnToLt ? 'How do you say this in Lithuanian?' : 'What does this mean in English?'}
          </h3>
          <h1 className="text-5xl font-display font-bold text-primary">
            {isEnToLt ? currentItem.en : currentItem.lt}
          </h1>
        </div>

        <div className="space-y-3 w-full">
          {options.map((opt, index) => (
            <button
              key={index}
              onClick={() => { if (selectedOption === null) setSelectedOption(index); }}
              disabled={selectedOption !== null}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all font-semibold flex justify-between items-center
                ${selectedOption === null ? 'border-gray-100 bg-white hover:border-gray-300 text-text/80' :
                  opt.isCorrect ? 'border-status-strong bg-green-50 text-status-strong' :
                  selectedOption === index ? 'border-status-weak bg-red-50 text-status-weak' : 'border-gray-100 bg-white opacity-50'}
              `}
            >
              <div>
                <span className="text-lg">{opt.text}</span>
                {selectedOption !== null && (
                  <span className="block text-sm italic opacity-80 mt-1">{opt.reveal}</span>
                )}
              </div>
              {selectedOption !== null && opt.isCorrect && <CheckCircle2 className="w-6 h-6 text-status-strong shrink-0 ml-2" />}
              {selectedOption === index && !opt.isCorrect && <XCircle className="w-6 h-6 text-status-weak shrink-0 ml-2" />}
            </button>
          ))}
        </div>

        {/* Mnemonic Hint */}
        {selectedOption !== null && currentItem.mnemonic && (
          <div className="mt-6 bg-accent/10 border border-accent/20 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Memory Trick</h4>
            <p className="text-sm text-text/80">{currentItem.mnemonic}</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={handleNext}
          disabled={selectedOption === null}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-md
            ${selectedOption !== null
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {currentIndex === practiceItems.length - 1 ? 'Finish' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}
