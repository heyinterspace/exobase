import { classNames } from '~/utils/classNames';
import React from 'react';

export const SpeechRecognitionButton = ({
  isListening,
  onStart,
  onStop,
  disabled,
}: {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
}) => {
  return (
    <button
      type="button"
      title={isListening ? 'Stop listening' : 'Start speech recognition'}
      disabled={disabled}
      onClick={isListening ? onStop : onStart}
      className={classNames(
        'flex items-center gap-1 px-2 py-1.5 shrink-0',
        'border border-bolt-elements-borderColor shadow-hard press-hard',
        'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary',
        'hover:border-accent hover:text-accent',
        'text-xs font-medium transition-theme',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-hard',
        { 'border-accent text-accent': isListening },
      )}
    >
      {isListening ? <div className="i-ph:microphone-slash text-sm" /> : <div className="i-ph:microphone text-sm" />}
      Voice
    </button>
  );
};
