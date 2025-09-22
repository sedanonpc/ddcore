import React from 'react';
import AIChatAssistant from './AIChatAssistant';
import '../styles/cyberpunk.css';

interface AIChatFloatingButtonProps {
  className?: string;
}

/**
 * AI Chat Floating Button Component
 * Displays a draggable AI chat assistant button
 * Available on all authenticated pages
 */
const AIChatFloatingButton: React.FC<AIChatFloatingButtonProps> = ({ className = '' }) => {
  return (
    <div className={`ai-chat-floating-container ${className}`}>
      <AIChatAssistant />
    </div>
  );
};

export default AIChatFloatingButton;
