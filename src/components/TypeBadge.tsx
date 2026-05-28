import { FileText, MessageCircle, HelpCircle, AlignLeft, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export default function TypeBadge({ type }: { type: string }) {
  let config = {
    icon: <FileText className="w-3 h-3 mr-1" />,
    label: 'Word',
    classes: 'bg-gray-100 text-gray-600 border-gray-200'
  };

  if (type === 'phrase') {
    config = {
      icon: <MessageCircle className="w-3 h-3 mr-1" />,
      label: 'Phrase',
      classes: 'bg-blue-50 text-blue-600 border-blue-200'
    };
  } else if (type === 'sentence') {
    config = {
      icon: <AlignLeft className="w-3 h-3 mr-1" />,
      label: 'Sentence',
      classes: 'bg-amber-50 text-amber-600 border-amber-200'
    };
  } else if (type === 'question') {
    config = {
      icon: <HelpCircle className="w-3 h-3 mr-1" />,
      label: 'Question',
      classes: 'bg-purple-50 text-purple-600 border-purple-200'
    };
  } else if (type === 'expression') {
    config = {
      icon: <Sparkles className="w-3 h-3 mr-1" />,
      label: 'Expression',
      classes: 'bg-green-50 text-green-600 border-green-200'
    };
  }

  return (
    <div className={clsx("flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider", config.classes)}>
      {config.icon}
      {config.label}
    </div>
  );
}
