import React from 'react';
import {
  CanvasBoardIcon,
  CompassIcon,
  ZapIcon,
  RocketIcon,
  Volume2Icon,
  VolumeXIcon,
  RefreshCwIcon,
  Trash2Icon,
  MessageSquareIcon,
  SettingsIcon,
} from '../icons/Icons';

export type TutorLevel = 'beginner' | 'intermediate' | 'pro';

interface HeaderProps {
  level: TutorLevel;
  onLevelChange: (level: TutorLevel) => void;
  isConnected: boolean;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenSettings: () => void;
  onClearCanvas: () => void;
  onSyncCanvas: () => void;
  isSyncing: boolean;
  chatVisible: boolean;
  onToggleChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  level,
  onLevelChange,
  isConnected,
  isAudioEnabled,
  onToggleAudio,
  onOpenSettings,
  onClearCanvas,
  onSyncCanvas,
  isSyncing,
  chatVisible,
  onToggleChat,
}) => {
  return (
    <header className="tutor-header">
      {/* Brand */}
      <div className="tutor-brand">
        <div className="tutor-logo-icon">
          <CanvasBoardIcon size={16} />
        </div>
        <div className="tutor-brand-text">
          <h1>Graphical AI Tutor</h1>
          <p>Interactive Whiteboard Learning</p>
        </div>
      </div>

      {/* Level Selector */}
      <div className="level-selector-group" role="radiogroup" aria-label="Pedagogical Level">
        <button
          type="button"
          className={`level-btn level-beginner ${level === 'beginner' ? 'active' : ''}`}
          onClick={() => onLevelChange('beginner')}
          title="Beginner: Intuitive real-world analogies, step-by-step visuals"
        >
          <CompassIcon size={13} />
          <span>Beginner</span>
        </button>
        <button
          type="button"
          className={`level-btn level-intermediate ${level === 'intermediate' ? 'active' : ''}`}
          onClick={() => onLevelChange('intermediate')}
          title="Intermediate: Practical mechanisms, architectural workflows"
        >
          <ZapIcon size={13} />
          <span>Intermediate</span>
        </button>
        <button
          type="button"
          className={`level-btn level-pro ${level === 'pro' ? 'active' : ''}`}
          onClick={() => onLevelChange('pro')}
          title="Pro: Deep technical precision, protocols, tradeoffs"
        >
          <RocketIcon size={13} />
          <span>Pro</span>
        </button>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        {/* Connection Status */}
        <div className="status-pill" title={isConnected ? 'Connected to Canvas Server' : 'Disconnected'}>
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Audio Narration Toggle */}
        <button
          type="button"
          className={`icon-btn ${isAudioEnabled ? 'active' : ''}`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Voice narration active (Click to mute)' : 'Voice narration muted (Click to speak answers)'}
          aria-label="Toggle Voice Narration"
        >
          {isAudioEnabled ? <Volume2Icon size={16} /> : <VolumeXIcon size={16} />}
        </button>

        {/* Sync Canvas */}
        <button
          type="button"
          className="icon-btn"
          onClick={onSyncCanvas}
          disabled={isSyncing || !isConnected}
          title="Sync whiteboard to server"
          aria-label="Sync Canvas"
        >
          <RefreshCwIcon size={15} className={isSyncing ? 'spinner' : ''} />
        </button>

        {/* Clear Canvas */}
        <button
          type="button"
          className="icon-btn"
          onClick={onClearCanvas}
          disabled={!isConnected}
          title="Clear Whiteboard"
          aria-label="Clear Canvas"
        >
          <Trash2Icon size={15} />
        </button>

        {/* Toggle Chat Panel */}
        <button
          type="button"
          className={`icon-btn ${chatVisible ? 'active' : ''}`}
          onClick={onToggleChat}
          title="Toggle Tutor Chat Panel"
          aria-label="Toggle Chat"
        >
          <MessageSquareIcon size={15} />
        </button>

        {/* Settings Button */}
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          title="BYOK & LLM Provider Settings"
          aria-label="Settings"
        >
          <SettingsIcon size={15} />
        </button>
      </div>
    </header>
  );
};
