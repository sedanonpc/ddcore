import React from "react"
import { motion } from "framer-motion"
import aiIcon from "../assets/images/ICON@10x.png"
import { blockchainService } from "../services/blockchain"

interface AIChatAssistantProps {
  className?: string
}

interface Position {
  x: number
  y: number
}

interface ChatMessage {
  id: string
  content: string
  type: 'text' | 'voice'
  timestamp: Date
  isUser: boolean
}

interface ChatResponse {
  message: string
  type: 'text' | 'voice'
  audioUrl?: string
}

/**
 * AI Chat Assistant Component
 * Lean message relay to Telegram-compatible LLM backend
 */
const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ className = '' }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioChunksRef = React.useRef<Blob[]>([])
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = React.useRef(false)
  const wasDraggingRef = React.useRef(false)
  const dragStartRef = React.useRef<Position>({ x: 0, y: 0 })
  const initialPositionRef = React.useRef<Position>({ x: 0, y: 0 })

  const [showForm, setShowForm] = React.useState(false)
  const [position, setPosition] = React.useState<Position>(() => {
    // Initialize position based on screen size
    const isMobileInit = window.innerWidth < 768
    return {
      x: isMobileInit ? window.innerWidth - 80 : window.innerWidth - 100,
      y: isMobileInit ? window.innerHeight - 80 : window.innerHeight - 100
    }
  })
  const [isDragging, setIsDragging] = React.useState(false)
  const [windowSize, setWindowSize] = React.useState({ width: window.innerWidth, height: window.innerHeight })

  // Chat-specific state
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [inputType, setInputType] = React.useState<'text' | 'voice'>('text')
  const [isRecording, setIsRecording] = React.useState(false)
  const [sessionId] = React.useState(() => `session_${Date.now()}_${Math.random()}`)

  // Calculate responsive dimensions
  const isMobile = windowSize.width < 768
  const FORM_WIDTH = isMobile ? 320 : 400
  const FORM_HEIGHT = isMobile ? 500 : 600
  const BUTTON_SIZE = isMobile ? 50 : 60

  // Load saved position from localStorage
  React.useEffect(() => {
    const savedPosition = localStorage.getItem('ai-chat-position')
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition)
        setPosition(parsed)
      } catch (e) {
        console.warn('Failed to parse saved AI chat position')
      }
    }
  }, [])

  // Save position to localStorage
  const savePosition = React.useCallback((newPosition: Position) => {
    localStorage.setItem('ai-chat-position', JSON.stringify(newPosition))
  }, [])

  const triggerClose = React.useCallback(() => {
    setShowForm(false)
    textareaRef.current?.blur()
  }, [])



  // Simple click handler for button - open chat
  const handleButtonClick = React.useCallback(() => {
    // Only open chat if we haven't been dragging
    if (!showForm && !wasDraggingRef.current) {
      setShowForm(true)
      setTimeout(() => {
        textareaRef.current?.focus()
      })
    }
    // Reset the wasDragging flag after click
    wasDraggingRef.current = false
  }, [showForm])

  // Mouse down handler for button - start drag timer
  const handleButtonMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Only prevent default if we're actually going to drag
    if (e.button === 0) { // Left mouse button only
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      initialPositionRef.current = { ...position }
      
      longPressTimerRef.current = setTimeout(() => {
        setIsDragging(true)
        isDraggingRef.current = true
      }, 500) // 500ms for long press
    }
  }, [position])

  // Mouse down handler for chat window header - for dragging the chat window
  const handleChatMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initialPositionRef.current = { ...position }
    setIsDragging(true)
    isDraggingRef.current = true
  }, [position])

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault() // Only prevent default when actually dragging
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, initialPositionRef.current.x + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, initialPositionRef.current.y + deltaY))
      }
      setPosition(newPosition)
    }
  }, [BUTTON_SIZE])

  const handleMouseUp = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    if (isDraggingRef.current) {
      // We were dragging - just stop dragging
      setIsDragging(false)
      isDraggingRef.current = false
      wasDraggingRef.current = true // Mark that we were dragging
      savePosition(position)
    }
  }, [position, savePosition])

  // Touch handlers for button only
  const handleButtonTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    dragStartRef.current = { x: touch.clientX, y: touch.clientY }
    initialPositionRef.current = { ...position }
    
    longPressTimerRef.current = setTimeout(() => {
      setIsDragging(true)
      isDraggingRef.current = true
    }, 500) // 500ms for long press
  }, [position])

  // Touch handlers for chat window header
  const handleChatTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    dragStartRef.current = { x: touch.clientX, y: touch.clientY }
    initialPositionRef.current = { ...position }
    setIsDragging(true)
    isDraggingRef.current = true
  }, [position])

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault() // Only prevent default when actually dragging
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStartRef.current.x
      const deltaY = touch.clientY - dragStartRef.current.y
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, initialPositionRef.current.x + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, initialPositionRef.current.y + deltaY))
      }
      setPosition(newPosition)
    }
  }, [BUTTON_SIZE])

  const handleTouchEnd = React.useCallback((e?: TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    if (isDraggingRef.current) {
      // We were dragging - just stop dragging
      setIsDragging(false)
      isDraggingRef.current = false
      wasDraggingRef.current = true // Mark that we were dragging
      savePosition(position)
    }
  }, [position, savePosition])

  // Global event listeners for drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', () => handleMouseUp())
      document.addEventListener('touchmove', handleTouchMove, { passive: true }) // Use passive for touchmove
      document.addEventListener('touchend', () => handleTouchEnd())
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', () => handleMouseUp())
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', () => handleTouchEnd())
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      
      // Adjust position if button goes off screen
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - BUTTON_SIZE),
        y: Math.min(prev.y, window.innerHeight - BUTTON_SIZE)
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [BUTTON_SIZE])

  React.useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler)
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [showForm, triggerClose])

  /**
   * Send message to Telegram-compatible backend
   */
  const sendMessageToBackend = async (content: string, type: 'text' | 'voice', audioBlob?: Blob): Promise<ChatResponse> => {
    const user = blockchainService.getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const formData = new FormData()
    formData.append('message', content)
    formData.append('type', type)
    formData.append('sessionId', sessionId)
    formData.append('userId', user.walletAddress)
    formData.append('username', user.username)
    
    if (audioBlob) {
      formData.append('audio', audioBlob, 'voice-message.webm')
    }

    const response = await fetch(`http://127.0.0.1:8001/chat`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Handle text message submission
   */
  const handleTextSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const message = textareaRef.current?.value?.trim()
    if (!message || isLoading) return

    setIsLoading(true)
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: message,
      type: 'text',
      timestamp: new Date(),
      isUser: true
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await sendMessageToBackend(message, 'text')
      
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        content: response.message,
        type: response.type,
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, aiMessage])

      // Handle voice response
      if (response.type === 'voice' && response.audioUrl) {
        const audio = new Audio(response.audioUrl)
        audio.play()
      }

      // Clear input
      if (textareaRef.current) {
        textareaRef.current.value = ''
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: 'Sorry, I encountered an error. Please try again.',
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Start voice recording
   */
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await handleVoiceSubmission(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  /**
   * Stop voice recording and send
   */
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  /**
   * Handle voice message submission
   */
  const handleVoiceSubmission = async (audioBlob: Blob) => {
    if (isLoading) return

    setIsLoading(true)
    
    // Add user voice message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: '[Voice Message]',
      type: 'voice',
      timestamp: new Date(),
      isUser: true
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await sendMessageToBackend('[Voice Message]', 'voice', audioBlob)
      
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        content: response.message,
        type: response.type,
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, aiMessage])

      // Handle voice response
      if (response.type === 'voice' && response.audioUrl) {
        const audio = new Audio(response.audioUrl)
        audio.play()
      }
    } catch (error) {
      console.error('Voice chat error:', error)
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: 'Sorry, I encountered an error processing your voice message.',
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") triggerClose()
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <>
      {/* Background Blur Overlay */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999,
            pointerEvents: 'auto',
          }}
          onClick={triggerClose}
        />
      )}

      {/* AI Chat Assistant */}
      <div 
        className={`ai-chat-assistant ${className}`}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
      >
      <motion.div
        ref={wrapperRef}
        className="ai-chat-panel"
        style={{
          background: showForm ? 'var(--bg-card)' : 'transparent',
          border: showForm ? '2px solid var(--border-accent)' : 'none',
          boxShadow: showForm 
            ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(219, 0, 4, 0.3), var(--shadow-glow)' 
            : 'none',
          borderRadius: showForm ? '14px' : '50%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          cursor: showForm ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          userSelect: 'none',
          touchAction: 'auto', // Allow normal touch behavior
        }}
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : BUTTON_SIZE,
          height: showForm ? FORM_HEIGHT : BUTTON_SIZE,
          scale: isDragging ? 1.15 : (showForm ? 1.05 : 1),
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8,
          delay: showForm ? 0 : 0.05,
        }}
      >
         {/* Animated AI Button - Only show when form is closed */}
         {!showForm && (
           <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.8 }}
             transition={{ duration: 0.4, type: "spring", stiffness: 400, damping: 25 }}
             style={{
               width: '100%',
               height: '100%',
               position: 'relative',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
             }}
             onClick={handleButtonClick}
             onMouseDown={handleButtonMouseDown}
             onTouchStart={handleButtonTouchStart}
           >
             {/* Simple Red Border Frame */}
             <div
               style={{
                 position: 'absolute',
                 zIndex: -1,
                 height: '100%',
                 width: '100%',
                 border: '3px solid #ff0000',
                 borderRadius: '50%',
                 background: 'transparent',
               }}
             />

             {/* Main Button */}
             <div
               style={{
                 position: 'relative',
                 background: '#8B0000',
                 border: 'none',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 width: '100%',
                 height: '100%',
                 minWidth: BUTTON_SIZE,
                 minHeight: BUTTON_SIZE,
                 boxShadow: 'none',
                 fontFamily: 'monospace',
               }}
             >
               {/* Simple Text Label */}
               <div
                 style={{
                   userSelect: 'none',
                   pointerEvents: 'none',
                   zIndex: 2,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   flexDirection: 'column',
                   gap: '2px',
                 }}
               >
                 <div
                   style={{
                     color: '#ffffff',
                     fontFamily: 'monospace',
                     fontSize: isMobile ? '8px' : '10px',
                     fontWeight: 'bold',
                     textTransform: 'uppercase',
                     letterSpacing: '1px',
                     textShadow: 'none',
                   }}
                 >
                   AI
                 </div>
                 <div
                   style={{
                     color: '#ffffff',
                     fontFamily: 'monospace',
                     fontSize: isMobile ? '6px' : '7px',
                     opacity: 0.8,
                     textTransform: 'uppercase',
                     letterSpacing: '0.5px',
                   }}
                 >
                   CHAT
                 </div>
               </div>

             </div>
           </motion.div>
         )}

        {/* Dock Bar - Only show when form is open */}
        {showForm && (
          <footer style={{
            marginTop: 'auto',
            display: 'flex',
            height: '44px',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            background: '#000000',
            border: '1px solid #00ff00',
            borderRadius: '0 0 4px 4px',
            fontFamily: 'monospace',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0 12px'
            }}>
              <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    background: '#00ff00',
                    borderRadius: '0',
                    animation: 'consoleBlink 1s ease-in-out infinite',
                  }}
                />
                <span style={{
                  color: '#00ff00',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  SYSTEM_READY
                </span>
              </div>
            </div>
          </footer>
        )}

          {/* Chat Interface - Only show when form is open */}
          {showForm && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                width: FORM_WIDTH,
                height: FORM_HEIGHT,
                pointerEvents: "all",
                background: '#000000',
                border: '1px solid #DB0004',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header Bar */}
              <div
                style={{
                  height: '44px',
                  background: '#000000',
                  border: '1px solid #00ff00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  cursor: 'grab',
                  userSelect: 'none',
                  borderRadius: '4px 4px 0 0',
                  fontFamily: 'monospace',
                }}
                onMouseDown={handleChatMouseDown}
                onTouchStart={handleChatTouchStart}
              >
                {/* Left side - Console Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '1px solid #00ff00',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '2px',
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#00ff00',
                      borderRadius: '0',
                    }} />
                  </div>
                  <span style={{
                    color: '#00ff00',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    textShadow: '0 0 3px rgba(0, 255, 0, 0.8)',
                  }}>
                    AI_CONSOLE
                  </span>
                </div>

                {/* Right side - Close button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerClose()
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    background: 'transparent',
                    border: '1px solid #00ff00',
                    color: '#00ff00',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    transition: 'all 0.2s ease',
                  }}
                >
                  [X]
                </button>
              </div>

              {/* Messages Area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                background: '#000000',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontFamily: 'monospace',
              }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: '2px',
                      background: message.isUser ? '#001100' : '#000800',
                      color: '#00ff00',
                      fontSize: '0.75rem',
                      border: '1px solid #00ff00',
                      fontFamily: 'monospace',
                      lineHeight: '1.4',
                    }}>
                      {message.isUser ? '> ' : 'AI: '}{message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '2px',
                      background: '#000800',
                      color: '#00ff00',
                      fontSize: '0.75rem',
                      border: '1px solid #00ff00',
                      fontFamily: 'monospace',
                    }}>
                      AI: PROCESSING...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div style={{
                padding: '16px',
                background: '#000000',
                borderTop: '1px solid #00ff00',
                fontFamily: 'monospace',
              }}>
                {/* Input Type Toggle */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <button
                    type="button"
                    onClick={() => setInputType('text')}
                    style={{
                      padding: '6px 12px',
                      background: inputType === 'text' ? '#001100' : 'transparent',
                      border: '1px solid #00ff00',
                      color: '#00ff00',
                      borderRadius: '2px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                    }}
                  >
                    [TEXT]
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('voice')}
                    style={{
                      padding: '6px 12px',
                      background: inputType === 'voice' ? '#001100' : 'transparent',
                      border: '1px solid #00ff00',
                      color: '#00ff00',
                      borderRadius: '2px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                    }}
                  >
                    [VOICE]
                  </button>
                </div>

                {/* Text Input */}
                {inputType === 'text' && (
                  <form onSubmit={handleTextSubmit}>
                    <textarea
                      ref={textareaRef}
                      placeholder="> ENTER_MESSAGE_HERE"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        height: '60px',
                        resize: 'none',
                        outline: 'none',
                        background: '#000800',
                        border: '1px solid #00ff00',
                        borderRadius: '2px',
                        color: '#00ff00',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        padding: '8px',
                        marginBottom: '8px',
                      }}
                      onKeyDown={handleKeys}
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#001100',
                        border: '1px solid #00ff00',
                        borderRadius: '2px',
                        color: '#00ff00',
                        fontSize: '0.75rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isLoading ? '[SENDING...]' : '[SEND]'}
                    </button>
                  </form>
                )}

                {/* Voice Input */}
                {inputType === 'voice' && (
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onMouseDown={startVoiceRecording}
                      onMouseUp={stopVoiceRecording}
                      onTouchStart={startVoiceRecording}
                      onTouchEnd={stopVoiceRecording}
                      disabled={isLoading}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '2px',
                        background: isRecording ? '#001100' : '#000800',
                        border: '2px solid #00ff00',
                        color: '#00ff00',
                        fontSize: '16px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                      }}
                    >
                      {isRecording ? '[STOP]' : '[REC]'}
                    </button>
                    <p style={{
                      color: '#00ff00',
                      fontSize: '0.75rem',
                      marginTop: '8px',
                      opacity: 0.7,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                    }}>
                      {isRecording ? 'RECORDING... RELEASE TO SEND' : 'HOLD TO RECORD'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
      </motion.div>
      </div>
    </>
  )
}

export default AIChatAssistant
