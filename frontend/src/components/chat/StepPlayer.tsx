import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  ArrowRightIcon,
  SparklesIcon,
  Volume2Icon,
  CheckCircleIcon,
} from '../icons/Icons';

export interface StepDrawOp {
  op: string;
  id: string;
  [key: string]: any;
}

export interface TeachingStep {
  stepNumber: number;
  title: string;
  speech: string;
  explanation?: string;
  draw?: StepDrawOp[];
  highlightElementIds?: string[];
}

interface StepPlayerProps {
  steps: TeachingStep[];
  onStepChange?: (stepIndex: number, step: TeachingStep) => void;
  onSpeakText?: (text: string, onEnded?: () => void) => void;
  onStopSpeaking?: () => void;
  isAudioEnabled?: boolean;
  autoPlay?: boolean;
}

export const StepPlayer: React.FC<StepPlayerProps> = ({
  steps,
  onStepChange,
  onSpeakText,
  onStopSpeaking,
  isAudioEnabled = true,
  autoPlay = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[currentIndex] || steps[0];

  const clearTimer = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  // Auto-trigger Step 1 on mount
  useEffect(() => {
    if (autoPlay && steps.length > 0) {
      setIsPlaying(true);
      const initTimer = setTimeout(() => {
        playStep(0);
      }, 200);
      return () => clearTimeout(initTimer);
    }
  }, []);

  const playStep = useCallback(
    (index: number) => {
      clearTimer();
      const step = steps[index];
      if (!step) return;

      if (onStepChange) {
        onStepChange(index, step);
      }

      if (isAudioEnabled && onSpeakText && step.speech) {
        onSpeakText(step.speech, () => {
          if (autoAdvance && index < totalSteps - 1) {
            advanceTimerRef.current = setTimeout(() => {
              setCurrentIndex(index + 1);
              playStep(index + 1);
            }, 1200);
          } else {
            setIsPlaying(false);
          }
        });
      } else if (autoAdvance && index < totalSteps - 1) {
        advanceTimerRef.current = setTimeout(() => {
          setCurrentIndex(index + 1);
          playStep(index + 1);
        }, 3500);
      } else {
        setIsPlaying(false);
      }
    },
    [steps, totalSteps, isAudioEnabled, onSpeakText, onStepChange, autoAdvance]
  );

  const handleTogglePlay = () => {
    if (isPlaying) {
      clearTimer();
      if (onStopSpeaking) onStopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playStep(currentIndex);
    }
  };

  const handleNext = () => {
    clearTimer();
    if (onStopSpeaking) onStopSpeaking();
    if (currentIndex < totalSteps - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (isPlaying) {
        playStep(nextIdx);
      } else if (onStepChange) {
        onStepChange(nextIdx, steps[nextIdx]);
      }
    }
  };

  const handlePrev = () => {
    clearTimer();
    if (onStopSpeaking) onStopSpeaking();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      if (isPlaying) {
        playStep(prevIdx);
      } else if (onStepChange) {
        onStepChange(prevIdx, steps[prevIdx]);
      }
    }
  };

  const handleReplay = () => {
    clearTimer();
    if (onStopSpeaking) onStopSpeaking();
    setIsPlaying(true);
    playStep(currentIndex);
  };

  if (!steps || steps.length === 0) return null;

  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <div className="teaching-step-player">
      {/* Player Header with Step Indicator */}
      <div className="step-player-header">
        <div className="step-badge">
          <SparklesIcon size={13} />
          <span>Step {currentIndex + 1} of {totalSteps}</span>
        </div>
        <div className="step-title-text">{currentStep.title}</div>
      </div>

      {/* Progress Bar */}
      <div className="step-progress-track">
        <div
          className="step-progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Speech Narration Box */}
      <div className="step-narration-box">
        <div className="step-narration-icon">
          <Volume2Icon size={14} />
        </div>
        <div className="step-narration-text">{currentStep.speech}</div>
      </div>

      {/* Step Dots & Controls */}
      <div className="step-player-footer">
        <div className="step-dots-container">
          {steps.map((_, idx) => (
            <button
              key={idx}
              className={`step-dot ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'completed' : ''}`}
              onClick={() => {
                clearTimer();
                if (onStopSpeaking) onStopSpeaking();
                setCurrentIndex(idx);
                if (isPlaying) {
                  playStep(idx);
                } else if (onStepChange) {
                  onStepChange(idx, steps[idx]);
                }
              }}
              title={`Jump to Step ${idx + 1}`}
              aria-label={`Jump to Step ${idx + 1}`}
            />
          ))}
        </div>

        <div className="step-action-buttons">
          <button
            type="button"
            className="step-btn prev-btn"
            disabled={currentIndex === 0}
            onClick={handlePrev}
            title="Previous step"
          >
            Back
          </button>

          <button
            type="button"
            className="step-btn replay-btn"
            onClick={handleReplay}
            title="Replay this step"
          >
            <RotateCcwIcon size={13} />
          </button>

          <button
            type="button"
            className={`step-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause lesson' : 'Play step-by-step lesson'}
          >
            {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play Step'}</span>
          </button>

          <button
            type="button"
            className="step-btn next-btn"
            disabled={currentIndex === totalSteps - 1}
            onClick={handleNext}
            title="Next step"
          >
            <span>Next</span>
            <ArrowRightIcon size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
