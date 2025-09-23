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
    // Default position: lower right of screen
    const isMobileInit = window.innerWidth < 768
    return {
      x: window.innerWidth - (isMobileInit ? 80 : 100),
      y: window.innerHeight - (isMobileInit ? 80 : 100)
    }
  })
  const [isDragging, setIsDragging] = React.useState(false)
  const [isDragReady, setIsDragReady] = React.useState(false)
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
    
    // Reset button position to default (lower right)
    const isMobile = window.innerWidth < 768
    const defaultX = window.innerWidth - (isMobile ? 80 : 100)
    const defaultY = window.innerHeight - (isMobile ? 80 : 100)
    setPosition({ x: defaultX, y: defaultY })
  }, [])



  // Simple click handler for button - open chat
  const handleButtonClick = React.useCallback(() => {
    // Only open chat if we haven't been dragging
    if (!showForm && !wasDraggingRef.current) {
      // Center the chat window when opening
      const centerX = (window.innerWidth - FORM_WIDTH) / 2
      const centerY = (window.innerHeight - FORM_HEIGHT) / 2
      setPosition({ x: centerX, y: centerY })
      
      setShowForm(true)
      setTimeout(() => {
        textareaRef.current?.focus()
      })
    }
    // Reset the wasDragging flag after click
    wasDraggingRef.current = false
  }, [showForm, FORM_WIDTH, FORM_HEIGHT])

  // Mouse down handler for button - start drag timer
  const handleButtonMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.button === 0) { // Left mouse button only
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      initialPositionRef.current = { ...position }
      
      // Start drag ready animation
      setIsDragReady(true)
      
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
      e.preventDefault()
      e.stopPropagation()
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      
      // Calculate new position with proper boundaries
      const newX = initialPositionRef.current.x + deltaX
      const newY = initialPositionRef.current.y + deltaY
      
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, newX)),
        y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, newY))
      }
      
      setPosition(newPosition)
    }
  }, [BUTTON_SIZE])

  const handleMouseUp = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // Reset drag ready state
    setIsDragReady(false)
    
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
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    dragStartRef.current = { x: touch.clientX, y: touch.clientY }
    initialPositionRef.current = { ...position }
    
    // Start drag ready animation
    setIsDragReady(true)
    
    // Start drag after 0.5 second delay
    longPressTimerRef.current = setTimeout(() => {
      setIsDragging(true)
      isDraggingRef.current = true
    }, 500)
  }, [position])

  // Touch click handler for button
  const handleButtonTouchEnd = React.useCallback(() => {
    // Clear the drag ready timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // Reset drag states
    setIsDragReady(false)
    setIsDragging(false)
    isDraggingRef.current = false
    
    // Only open chat if we haven't been dragging
    if (!showForm && !wasDraggingRef.current) {
      // Center the chat window when opening
      const centerX = (window.innerWidth - FORM_WIDTH) / 2
      const centerY = (window.innerHeight - FORM_HEIGHT) / 2
      setPosition({ x: centerX, y: centerY })
      
      setShowForm(true)
      setTimeout(() => {
        textareaRef.current?.focus()
      })
    }
    
    // Reset the wasDragging flag after touch end
    wasDraggingRef.current = false
  }, [showForm, FORM_WIDTH, FORM_HEIGHT])

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
      e.preventDefault()
      e.stopPropagation()
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStartRef.current.x
      const deltaY = touch.clientY - dragStartRef.current.y
      
      // Calculate new position with proper boundaries
      const newX = initialPositionRef.current.x + deltaX
      const newY = initialPositionRef.current.y + deltaY
      
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, newX)),
        y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, newY))
      }
      
      setPosition(newPosition)
    }
  }, [BUTTON_SIZE])

  const handleTouchEnd = React.useCallback((e?: TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // Reset drag ready state
    setIsDragReady(false)
    
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
      document.addEventListener('touchmove', handleTouchMove, { passive: false }) // Changed to false for better control
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
          scale: isDragging ? 1.1 : (isDragReady ? 1.05 : (showForm ? 1.05 : 1)),
          opacity: isDragging ? 0.9 : (isDragReady ? 0.8 : 1),
          filter: isDragReady ? 'hue-rotate(240deg) saturate(2) brightness(1.2)' : 'hue-rotate(0deg) saturate(1)',
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8,
          delay: showForm ? 0 : 0.05,
          filter: { duration: 0.3, ease: "easeInOut" },
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
             onTouchEnd={handleButtonTouchEnd}
           >
             {/* Enhanced Red Border Frame */}
             <div
               style={{
                 position: 'absolute',
                 zIndex: -1,
                 height: '100%',
                 width: '100%',
                 border: '3px solid #ff0000',
                 borderRadius: '50%',
                 background: 'transparent',
                 boxShadow: '0 0 15px rgba(255, 0, 0, 0.3), inset 0 0 15px rgba(255, 0, 0, 0.1)',
               }}
             />
             
             {/* Drag Ready Progress Ring */}
             {isDragReady && !isDragging && (
               <div
                 style={{
                   position: 'absolute',
                   zIndex: -1,
                   height: 'calc(100% + 12px)',
                   width: 'calc(100% + 12px)',
                   top: '-6px',
                   left: '-6px',
                   border: '3px solid transparent',
                   borderTop: '3px solid #000080',
                   borderRight: '3px solid #000080',
                   borderRadius: '50%',
                   background: 'transparent',
                   animation: 'dragReadySpin 0.3s linear infinite',
                   filter: 'drop-shadow(0 0 8px #000080)',
                 }}
               />
             )}
             
             {/* Inner Ring for Depth */}
             <div
               style={{
                 position: 'absolute',
                 zIndex: -1,
                 height: 'calc(100% - 8px)',
                 width: 'calc(100% - 8px)',
                 top: '4px',
                 left: '4px',
                 border: '1px solid rgba(255, 0, 0, 0.4)',
                 borderRadius: '50%',
                 background: 'transparent',
               }}
             />

             {/* Main Button */}
             <div
               style={{
                 position: 'relative',
                 background: 'radial-gradient(circle at 30% 30%, #a00000, #8B0000, #6B0000)',
                 border: 'none',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 width: '100%',
                 height: '100%',
                 minWidth: BUTTON_SIZE,
                 minHeight: BUTTON_SIZE,
                 boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 0, 0, 0.1)',
                 fontFamily: 'monospace',
                 transition: 'all 0.3s ease',
                 animation: isDragReady ? 'buttonSpin 0.5s linear infinite' : 'none',
               }}
             >
               {/* Enhanced Icon with Visual Effects */}
               <div
                 style={{
                   userSelect: 'none',
                   pointerEvents: 'none',
                   zIndex: 2,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   position: 'relative',
                 }}
               >
                 {/* Main Icon */}
                 <img
                   src={aiIcon}
                   alt="AI Assistant"
                   style={{
                     width: isMobile ? '28px' : '32px',
                     height: isMobile ? '28px' : '32px',
                     filter: 'brightness(0) invert(1) drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))',
                     objectFit: 'contain',
                     transition: 'all 0.3s ease',
                     zIndex: 2,
                   }}
                 />
                 
                 {/* Subtle Glow Effect */}
                 <div
                   style={{
                     position: 'absolute',
                     top: '50%',
                     left: '50%',
                     transform: 'translate(-50%, -50%)',
                     width: isMobile ? '32px' : '36px',
                     height: isMobile ? '32px' : '36px',
                     background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
                     borderRadius: '50%',
                     zIndex: 1,
                     animation: 'iconPulse 2s ease-in-out infinite alternate',
                   }}
                 />
                 
                 {/* Icon Background Ring */}
                 <div
                   style={{
                     position: 'absolute',
                     top: '50%',
                     left: '50%',
                     transform: 'translate(-50%, -50%)',
                     width: isMobile ? '40px' : '44px',
                     height: isMobile ? '40px' : '44px',
                     border: '1px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '50%',
                     zIndex: 0,
                   }}
                 />
               </div>

             </div>
           </motion.div>
         )}

        {/* Dock Bar - Only show when form is open */}
        {showForm && (
          <footer style={{
            marginTop: 'auto',
            display: 'flex',
            height: '32px',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            background: '#2a0a0a',
            border: 'none',
            borderTop: '1px solid #dc2626',
            borderRadius: '0 0 8px 8px',
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
                    width: '6px',
                    height: '6px',
                    background: '#dc2626',
                    borderRadius: '50%',
                    animation: 'consoleBlink 2s ease-in-out infinite',
                    boxShadow: '0 0 6px rgba(220, 38, 38, 0.6)',
                  }}
                />
                <span style={{
                  color: '#ff6b6b',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
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
                background: '#1a0a0a',
                border: '1px solid #dc2626',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(220, 38, 38, 0.4)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Red accent lines */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(to bottom, #dc2626, transparent)',
                zIndex: 1,
              }} />
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(to bottom, #dc2626, transparent)',
                zIndex: 1,
              }} />
              {/* Header Bar */}
              <div
                style={{
                  height: '44px',
                  background: '#2a0a0a',
                  border: 'none',
                  borderBottom: '1px solid #dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  cursor: 'grab',
                  userSelect: 'none',
                  borderRadius: '0',
                  fontFamily: 'monospace',
                }}
                onMouseDown={handleChatMouseDown}
                onTouchStart={handleChatTouchStart}
              >
                {/* Left side - Terminal Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    color: '#ff6b6b',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    fontWeight: 'normal',
                    textTransform: 'none',
                    letterSpacing: '0.5px',
                    textShadow: '0 0 10px rgba(255, 107, 107, 0.5)',
                  }}>
                    &gt;_ DAREDEVIL_ANALYSIS_TERMINAL
                  </span>
                </div>

                {/* Right side - Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    style={{
                      width: '20px',
                      height: '20px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      opacity: 0.7,
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                  >
                    🔗
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerClose()
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      opacity: 0.7,
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                background: '#1a0a0a',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                fontFamily: 'monospace',
                position: 'relative',
              }}>
                {/* Grid pattern overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `
                    linear-gradient(90deg, rgba(255, 107, 107, 0.08) 1px, transparent 1px),
                    linear-gradient(rgba(255, 107, 107, 0.08) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                  pointerEvents: 'none',
                  zIndex: 0,
                }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: message.isUser 
                          ? 'linear-gradient(135deg, #dc2626, #b91c1c)' 
                          : 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        border: 'none',
                        fontFamily: 'monospace',
                        lineHeight: '1.5',
                        boxShadow: message.isUser 
                          ? '0 0 10px rgba(220, 38, 38, 0.4)' 
                          : '0 0 10px rgba(153, 27, 27, 0.4)',
                        position: 'relative',
                      }}>
                        {!message.isUser && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            fontSize: '0.75rem',
                          }}>
                            <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                              &gt;_ DareDevil
                            </span>
                            <span style={{ color: '#ff9999', fontSize: '0.7rem' }}>
                              NBA Analytics Expert
                            </span>
                          </div>
                        )}
                        <div style={{ marginBottom: '8px' }}>
                          {message.content}
                        </div>
                        {!message.isUser && (
                          <div style={{
                            fontSize: '0.7rem',
                            color: '#ff9999',
                            marginBottom: '4px',
                          }}>
                            PREDICTION ENGINE v2.5
                          </div>
                        )}
                        <div style={{
                          fontSize: '0.7rem',
                          color: '#ff9999',
                          textAlign: message.isUser ? 'right' : 'left',
                        }}>
                          {message.timestamp.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        border: 'none',
                        fontFamily: 'monospace',
                        lineHeight: '1.5',
                        boxShadow: '0 0 10px rgba(153, 27, 27, 0.4)',
                        position: 'relative',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                          fontSize: '0.75rem',
                        }}>
                          <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                            &gt;_ DareDevil
                          </span>
                          <span style={{ color: '#ff9999', fontSize: '0.7rem' }}>
                            NBA Analytics Expert
                          </span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          I'm experiencing some technical difficulties with my analytics systems. Let me get back to you with that insight shortly.
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: '#ff9999',
                          marginBottom: '4px',
                        }}>
                          PREDICTION ENGINE v2.5
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: '#ff9999',
                        }}>
                          {new Date().toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <div style={{
                padding: '16px',
                background: '#1a0a0a',
                borderTop: '1px solid #dc2626',
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
                      background: inputType === 'text' ? '#dc2626' : 'transparent',
                      border: '1px solid #dc2626',
                      color: inputType === 'text' ? '#ffffff' : '#ff6b6b',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    [TEXT]
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('voice')}
                    style={{
                      padding: '6px 12px',
                      background: inputType === 'voice' ? '#dc2626' : 'transparent',
                      border: '1px solid #dc2626',
                      color: inputType === 'voice' ? '#ffffff' : '#ff6b6b',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    [VOICE]
                  </button>
                </div>

                {/* Text Input */}
                {inputType === 'text' && (
                  <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                      ref={textareaRef}
                      placeholder="Ask DareDevil for betting advice..."
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        height: '40px',
                        resize: 'none',
                        outline: 'none',
                        background: '#2a0a0a',
                        border: '1px solid #dc2626',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        padding: '8px 12px',
                        lineHeight: '1.4',
                      }}
                      onKeyDown={handleKeys}
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        width: '40px',
                        height: '40px',
                        background: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '16px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 0 8px rgba(220, 38, 38, 0.3)',
                      }}
                    >
                      ✈️
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
                        borderRadius: '8px',
                        background: isRecording 
                          ? 'linear-gradient(135deg, #dc2626, #b91c1c)' 
                          : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '16px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        boxShadow: isRecording 
                          ? '0 0 15px rgba(220, 38, 38, 0.6)' 
                          : '0 0 15px rgba(220, 38, 38, 0.4)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isRecording ? '⏹️' : '🎤'}
                    </button>
                    <p style={{
                      color: '#ff6b6b',
                      fontSize: '0.75rem',
                      marginTop: '8px',
                      fontFamily: 'monospace',
                    }}>
                      {isRecording ? 'Recording... Release to send' : 'Hold to record'}
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
