import React, { useState, useRef, useEffect } from 'react';
import type { TutorLevel } from '../header/Header';
import {
  MessageSquareIcon,
  RefreshCwIcon,
  LightbulbIcon,
  SparklesIcon,
  GraduationCapIcon,
  Volume2Icon,
  PenToolIcon,
  ArrowRightIcon,
  MicIcon,
  SendIcon,
  CheckCircleIcon,
} from '../icons/Icons';

import { StepPlayer, TeachingStep } from './StepPlayer';

export interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  steps?: TeachingStep[];
  visualEvidence?: {
    title: string;
    query?: string;
    sourceUrl?: string;
    dataUrl?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    analysisSpeech?: string;
    elementId?: string;
    fileId?: string;
  };
  drawingCount?: number;
  drawingDescription?: string;
  keyConcepts?: string[];
  suggestedFollowups?: string[];
  timestamp: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  level: TutorLevel;
  currentTopic: string;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onResetLesson: () => void;
  onReadAloud: (text: string) => void;
  isListening: boolean;
  onToggleListen: () => void;
  isSpeaking: boolean;
  selectedVoice?: string;
  onVoiceChange?: (voice: string) => void;
  onStepChange?: (stepIndex: number, step: TeachingStep) => void;
  onSpeakText?: (text: string, onEnded?: () => void) => void;
  onStopSpeaking?: () => void;
  isAudioEnabled?: boolean;
  onFocusEvidenceImage?: (elementId?: string) => void;
}

const STARTER_PROMPTS: Record<TutorLevel, string[]> = {
  beginner: [
    'How does the Internet work? Use an analogy.',
    'Explain how Binary Search works with an array.',
    'What is a database and how does it store items?',
  ],
  intermediate: [
    'Draw and explain the JavaScript Event Loop architecture.',
    'How does JWT authentication work between client and server?',
    'Explain the differences between REST and GraphQL.',
  ],
  pro: [
    'Illustrate Raft distributed consensus leader election.',
    'Explain microservices event-driven saga pattern with compensating transactions.',
    'Deep dive into LSM trees vs B+ trees write/read amplification tradeoffs.',
  ],
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  level,
  currentTopic,
  isLoading,
  onSendMessage,
  onResetLesson,
  onReadAloud,
  isListening,
  onToggleListen,
  isSpeaking,
  selectedVoice = 'en-US-ChristopherNeural',
  onVoiceChange,
  onStepChange,
  onSpeakText,
  onStopSpeaking,
  isAudioEnabled = true,
  onFocusEvidenceImage,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside className="tutor-chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <MessageSquareIcon size={15} />
          <span>Tutor</span>
          {currentTopic && (
            <span className="chat-lesson-badge" title={`Topic: ${currentTopic}`}>
              {currentTopic}
            </span>
          )}
        </div>
        <div className="chat-actions">
          {/* Quick Voice Selector */}
          {onVoiceChange && (
            <select
              className="chat-voice-select"
              value={selectedVoice}
              onChange={(e) => onVoiceChange(e.target.value)}
              title="Select Neural Voice"
              aria-label="Select Voice"
            >
              <optgroup label="English">
                <option value="en-US-ChristopherNeural">EN: Christopher (M)</option>
                <option value="en-US-JennyNeural">EN: Jenny (F)</option>
                <option value="en-US-GuyNeural">EN: Guy (M)</option>
                <option value="en-US-AriaNeural">EN: Aria (F)</option>
              </optgroup>
              <optgroup label="Urdu (اردو)">
                <option value="ur-PK-UzmaNeural">UR: Uzma (F - پاکستان)</option>
                <option value="ur-PK-AsadNeural">UR: Asad (M - پاکستان)</option>
                <option value="ur-IN-GulNeural">UR: Gul (F - بھارت)</option>
                <option value="ur-IN-SalmanNeural">UR: Salman (M - بھارت)</option>
              </optgroup>
            </select>
          )}

          <button
            type="button"
            className="action-text-btn"
            onClick={onResetLesson}
            title="Reset Lesson Conversation"
          >
            <RefreshCwIcon size={12} />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <div className="empty-state-icon">
              <LightbulbIcon size={22} />
            </div>
            <h3>Interactive Whiteboard</h3>
            <p>
              Ask any concept! I will explain it pedagogically and draw diagrams directly on your whiteboard in real-time.
            </p>
            <div className="quick-starters">
              {STARTER_PROMPTS[level].map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="followup-chip"
                  onClick={() => onSendMessage(prompt)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SparklesIcon size={13} style={{ color: 'var(--apple-blue)', flexShrink: 0 }} />
                    <span>{prompt}</span>
                  </span>
                  <ArrowRightIcon size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              <div className="bubble-body">
                {msg.sender === 'tutor' ? (
                  <>
                    <div className="tutor-speech-header">
                      <span className="tutor-speech-badge">
                        <GraduationCapIcon size={14} />
                        <span>Tutor Explanation</span>
                      </span>
                      <button
                        type="button"
                        className="action-text-btn"
                        onClick={() => onReadAloud(msg.text)}
                        title="Read aloud"
                      >
                        <Volume2Icon size={12} />
                        <span>Listen</span>
                      </button>
                    </div>

                    {/* Step-by-Step Interactive Teaching Player */}
                    {msg.steps && msg.steps.length > 0 && (
                      <StepPlayer
                        steps={msg.steps}
                        onStepChange={onStepChange}
                        onSpeakText={onSpeakText}
                        onStopSpeaking={onStopSpeaking}
                        isAudioEnabled={isAudioEnabled}
                      />
                    )}

                    {/* Drawing Indicator Pill */}
                    {msg.drawingCount !== undefined && msg.drawingCount > 0 && (
                      <div className="whiteboard-indicator">
                        <PenToolIcon size={14} />
                        <span>
                          Whiteboard updated: {msg.drawingCount} elements
                          {msg.drawingDescription ? ` (${msg.drawingDescription})` : ''}
                        </span>
                      </div>
                    )}

                    {/* Authentic Visual Evidence & Real-World Analysis Card */}
                    {msg.visualEvidence && (
                      <div className="visual-evidence-card">
                        <div className="visual-evidence-header">
                          <span className="visual-evidence-badge">
                            <SparklesIcon size={12} />
                            <span>Visual Evidence</span>
                          </span>
                          {msg.visualEvidence.sourceUrl && (
                            <a
                              href={msg.visualEvidence.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="visual-evidence-source"
                              title="Inspect original source URL"
                            >
                              {(() => {
                                try {
                                  const parsed = new URL(msg.visualEvidence.sourceUrl);
                                  return parsed.hostname.replace(/^www\./, '');
                                } catch {
                                  return 'External Source';
                                }
                              })()}
                            </a>
                          )}
                        </div>
                        {(msg.visualEvidence.dataUrl || msg.visualEvidence.sourceUrl) && (
                          <div className="visual-evidence-media">
                            <img
                              src={msg.visualEvidence.dataUrl || msg.visualEvidence.sourceUrl}
                              alt={msg.visualEvidence.title}
                              className="visual-evidence-img"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="visual-evidence-caption">
                          <div className="visual-evidence-title">{msg.visualEvidence.title}</div>
                          {msg.visualEvidence.analysisSpeech && (
                            <p className="visual-evidence-analysis">
                              {msg.visualEvidence.analysisSpeech.slice(0, 180)}...
                            </p>
                          )}
                          <div className="visual-evidence-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#2b8a3e', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircleIcon size={13} />
                              <span>Imported to Canvas</span>
                            </span>
                            {onFocusEvidenceImage && (
                              <button
                                type="button"
                                className="action-text-btn"
                                style={{ marginLeft: 'auto', fontSize: '11px', padding: '4px 9px', borderRadius: '6px', background: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}
                                onClick={() => onFocusEvidenceImage(msg.visualEvidence?.elementId)}
                                title="Zoom and focus on this diagram on your whiteboard"
                              >
                                <PenToolIcon size={12} />
                                <span>Show on Whiteboard</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Explanation Text */}
                    <div className="tutor-text" style={{ whiteSpace: 'pre-line' }}>
                      {msg.text}
                    </div>

                    {/* Key Concepts */}
                    {msg.keyConcepts && msg.keyConcepts.length > 0 && (
                      <div className="key-concepts-container">
                        {msg.keyConcepts.map((concept, i) => (
                          <span key={i} className="concept-tag">
                            #{concept}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggested Followups */}
                    {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                      <div className="followups-container">
                        <div className="followups-label">Suggested Next Steps</div>
                        {msg.suggestedFollowups.map((followup, i) => (
                          <button
                            key={i}
                            type="button"
                            className="followup-chip"
                            onClick={() => onSendMessage(followup)}
                          >
                            <span>{followup}</span>
                            <ArrowRightIcon size={12} style={{ opacity: 0.6 }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="chat-bubble tutor">
            <div className="bubble-body" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="spinner" />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Tutor is thinking and drawing on the whiteboard...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-composer">
        <form className="composer-row" onSubmit={handleSubmit}>
          {/* Voice Input Button */}
          <button
            type="button"
            className={`composer-btn mic-btn ${isListening ? 'listening' : ''}`}
            onClick={onToggleListen}
            title={isListening ? 'Listening... click to stop' : 'Click to speak question'}
            aria-label="Speak Question"
          >
            <MicIcon size={16} />
          </button>

          {/* Textarea */}
          <textarea
            className="composer-textarea"
            placeholder={isListening ? 'Listening to your voice...' : 'Ask a question or request a diagram...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            type="submit"
            className="composer-btn"
            disabled={!inputText.trim() || isLoading}
            title="Send Question"
            aria-label="Send"
          >
            <SendIcon size={15} />
          </button>
        </form>
      </div>
    </aside>
  );
};
