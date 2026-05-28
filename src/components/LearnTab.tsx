import { useState } from 'react';
import { Volume2, BookOpen } from 'lucide-react';
import { useAppStore } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import TypeBadge from './TypeBadge';
import WordBreakdown from './WordBreakdown';
import clsx from 'clsx';

export default function LearnTab() {
  const [showPattern, setShowPattern] = useState(false);
  const { sessionQueue, currentIndex, nextItem, endSession } = useAppStore();

  const currentItemId = sessionQueue[currentIndex];
  
  const currentItem = useLiveQuery(
    async () => currentItemId ? await db.course_items.get(currentItemId) : null,
    [currentItemId]
  );

  const handleScore = async (scoreDelta: number) => {
    if (!currentItemId) return;
    
    // Get existing progress or create new
    let progress = await db.user_item_progress.get({ item_id: currentItemId, user_id: 'local_user' });
    
    if (!progress) {
      const now = new Date();
      const nextReview = new Date(now);
      
      let initialScore = 0;
      let initialStatus: 'weak' | 'medium' | 'strong' | 'mastered' = 'weak';

      // Map initial grades to absolute buckets
      if (scoreDelta === -2) {
        initialScore = 0;
        initialStatus = 'weak';
        nextReview.setHours(now.getHours() + 12);
      } else if (scoreDelta === 1) {
        initialScore = 4;
        initialStatus = 'medium';
        nextReview.setDate(now.getDate() + 1);
      } else if (scoreDelta === 3) {
        initialScore = 7;
        initialStatus = 'strong';
        nextReview.setDate(now.getDate() + 3);
      } else if (scoreDelta === 5) {
        initialScore = 10;
        initialStatus = 'mastered';
        nextReview.setDate(now.getDate() + 7);
      }
      
      progress = {
        user_id: 'local_user',
        item_id: currentItemId,
        score: initialScore,
        status: initialStatus,
        times_seen: 1,
        times_correct: scoreDelta > 0 ? 1 : 0,
        times_wrong: scoreDelta <= 0 ? 1 : 0,
        last_result: scoreDelta > 0 ? 'correct' : 'wrong',
        last_seen_at: now.toISOString(),
        next_review_at: nextReview.toISOString()
      };
    } else {
      progress.score = Math.max(0, Math.min(10, progress.score + scoreDelta));
      progress.times_seen += 1;
      if (scoreDelta > 0) progress.times_correct += 1;
      else progress.times_wrong += 1;
      
      const now = new Date();
      const nextReview = new Date(now);
      
      // Dynamic SRS based on new score
      if (scoreDelta <= 0) nextReview.setHours(now.getHours() + 12);
      else if (progress.score < 5) nextReview.setDate(now.getDate() + 1);
      else if (progress.score < 8) nextReview.setDate(now.getDate() + 3);
      else nextReview.setDate(now.getDate() + 7);

      progress.last_result = scoreDelta > 0 ? 'correct' : 'wrong';
      progress.last_seen_at = now.toISOString();
      progress.next_review_at = nextReview.toISOString();
      
      if (progress.score >= 10) progress.status = 'mastered';
      else if (progress.score >= 7) progress.status = 'strong';
      else if (progress.score >= 4) progress.status = 'medium';
      else progress.status = 'weak';
    }
    
    await db.user_item_progress.put(progress!);
    setShowPattern(false);
    nextItem();
  };

  const playAudio = () => {
    if (!currentItem) return;
    
    // Use Google TTS API for much better, native-sounding Lithuanian
    // (Bypasses OS-level voice limitations which often default to English)
    const text = encodeURIComponent(currentItem.lt);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${text}&tl=lt&client=tw-ob`;
    
    const audio = new Audio(url);
    audio.playbackRate = 0.85; // slightly slower
    
    audio.play().catch(() => {
      // Fallback to native browser TTS if offline
      const utterance = new SpeechSynthesisUtterance(currentItem.lt);
      utterance.lang = 'lt-LT';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    });
  };

  if (!currentItemId || !currentItem) {
    return (
      <div className="flex flex-col h-full px-6 pt-12 pb-6 relative max-w-lg mx-auto items-center justify-center">
        <h2 className="text-xl font-display text-primary mb-2">You're all caught up!</h2>
        <button onClick={endSession} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Go back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-6 pt-12 pb-6 relative max-w-lg mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <h2 className="text-text/60 font-medium uppercase tracking-wider text-xs">{currentItem.topic || 'New Core Words'}</h2>
        <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{currentIndex + 1} of {sessionQueue.length}</span>
      </header>

      {/* Main Flashcard */}
      <div className="flex-1 flex flex-col justify-center mb-8 relative">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          
          <button 
            onClick={playAudio}
            className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-6 cursor-pointer hover:bg-primary/10 hover:text-primary transition-all group"
            aria-label="Play pronunciation"
          >
            <Volume2 className="w-6 h-6 text-secondary group-hover:text-primary transition-colors" />
          </button>

          <h1 className={clsx(
            "font-display font-bold text-primary mb-3 text-center",
            currentItem.type === 'sentence' ? "text-3xl" : "text-5xl"
          )}>
            {currentItem.lt}
          </h1>
          <p className={clsx(
            "text-text/80 font-medium text-center",
            currentItem.type === 'sentence' ? "text-xl mb-6" : "text-2xl mb-8"
          )}>
            {currentItem.en}
          </p>

          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <TypeBadge type={currentItem.type} />
            {currentItem.formality && (
              <span className="flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200 uppercase tracking-wider">
                {currentItem.formality}
              </span>
            )}
          </div>

          {(currentItem.grammar_note || currentItem.mnemonic || currentItem.literal_translation) && (
            <div className="w-full bg-background rounded-2xl p-5 mb-4 text-left">
              <h4 className="text-xs font-bold text-text/50 uppercase tracking-wider mb-2">Note</h4>
              <p className="text-sm font-medium text-primary mb-1">
                {currentItem.mnemonic || currentItem.grammar_note || (currentItem.literal_translation ? `Literal: ${currentItem.literal_translation}` : '')}
              </p>
            </div>
          )}

          <WordBreakdown ltText={currentItem.lt} />

          {!showPattern && currentItem.pattern ? (
            <button 
              onClick={() => setShowPattern(true)}
              className="text-secondary text-sm font-bold flex items-center mt-2 hover:opacity-80 transition-opacity"
            >
              <BookOpen className="w-4 h-4 mr-2" /> Show Pattern
            </button>
          ) : showPattern && currentItem.pattern ? (
            <div className="w-full bg-amber-50 rounded-2xl p-5 text-left border border-amber-100 mt-2 animate-in fade-in zoom-in duration-300">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Pattern</h4>
              <p className="text-base font-medium text-text mb-1">{currentItem.pattern}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Confidence Buttons */}
      <div className="grid grid-cols-2 gap-3 pb-4 mt-auto">
        <button onClick={() => handleScore(-2)} className="bg-white border-2 border-status-weak text-status-weak py-4 rounded-2xl font-bold hover:bg-red-50 transition-colors shadow-sm text-sm">
          I forgot
        </button>
        <button onClick={() => handleScore(1)} className="bg-white border-2 border-status-medium text-status-medium py-4 rounded-2xl font-bold hover:bg-amber-50 transition-colors shadow-sm text-sm">
          Almost know
        </button>
        <button onClick={() => handleScore(3)} className="bg-white border-2 border-status-strong text-status-strong py-4 rounded-2xl font-bold hover:bg-green-50 transition-colors shadow-sm text-sm">
          I know it
        </button>
        <button onClick={() => handleScore(5)} className="bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-sm text-sm border-2 border-primary">
          Too easy
        </button>
      </div>
    </div>
  );
}
