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
  const [responseType, setResponseType] = React.useState<'text' | 'voice'>('text')
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
  const sendMessageToBackend = async (content: string, type: 'text' | 'voice', audioBlob?: Blob, requestVoiceResponse: boolean = false): Promise<ChatResponse> => {
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
    
    // Add response_type parameter for voice responses
    if (requestVoiceResponse) {
      formData.append('response_type', 'voice')
    }
    
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
      const response = await sendMessageToBackend(message, 'text', undefined, responseType === 'voice')
      
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
        try {
          // Construct full URL to backend client
          const fullAudioUrl = response.audioUrl.startsWith('http') 
            ? response.audioUrl 
            : `https://rice-opens-manufacturers-kernel.trycloudflare.com${response.audioUrl}`
          
          const audio = new Audio(fullAudioUrl)
          audio.onerror = (error) => {
            console.error('Audio playback error:', error)
          }
          await audio.play()
        } catch (error) {
          console.error('Error playing audio:', error)
        }
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
      const response = await sendMessageToBackend('[Voice Message]', 'voice', audioBlob, responseType === 'voice')
      
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
        try {
          // Construct full URL to backend client
          const fullAudioUrl = response.audioUrl.startsWith('http') 
            ? response.audioUrl 
            : `https://rice-opens-manufacturers-kernel.trycloudflare.com${response.audioUrl}`
          
          const audio = new Audio(fullAudioUrl)
          audio.onerror = (error) => {
            console.error('Audio playback error:', error)
          }
          await audio.play()
        } catch (error) {
          console.error('Error playing audio:', error)
        }
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
             {/* Animated Border Layer 1 */}
             <div
               style={{
                 position: 'absolute',
                 zIndex: -1,
                 overflow: 'hidden',
                 height: '100%',
                 width: '100%',
                 borderRadius: '50%',
                 filter: 'blur(3px)',
               }}
             >
               <div
                 style={{
                   position: 'absolute',
                   zIndex: -2,
                   width: '999px',
                   height: '999px',
                   background: 'conic-gradient(#000, #DB0004 5%, #000 38%, #000 50%, #ff4d4d 60%, #000 87%)',
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%) rotate(60deg)',
                   transition: 'all 2s ease',
                 }}
               />
             </div>

             {/* Animated Border Layer 2 */}
             <div
               style={{
                 position: 'absolute',
                 zIndex: -1,
                 overflow: 'hidden',
                 height: '100%',
                 width: '100%',
                 borderRadius: '50%',
                 filter: 'blur(3px)',
               }}
             >
               <div
                 style={{
                   position: 'absolute',
                   zIndex: -2,
                   width: '600px',
                   height: '600px',
                   background: 'conic-gradient(rgba(0,0,0,0), #8B0000, rgba(0,0,0,0) 10%, rgba(0,0,0,0) 50%, #CC0000, rgba(0,0,0,0) 60%)',
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%) rotate(82deg)',
                   transition: 'all 2s ease',
                 }}
               />
             </div>

             {/* Animated Border Layer 3 */}
             <div
               style={{
                 position: 'absolute',
                 zIndex: -1,
                 overflow: 'hidden',
                 height: '100%',
                 width: '100%',
                 borderRadius: '50%',
                 filter: 'blur(2px)',
               }}
             >
               <div
                 style={{
                   position: 'absolute',
                   zIndex: -2,
                   width: '600px',
                   height: '600px',
                   background: 'conic-gradient(rgba(0,0,0,0) 0%, #ff6b6b, rgba(0,0,0,0) 8%, rgba(0,0,0,0) 50%, #ff8e8e, rgba(0,0,0,0) 58%)',
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%) rotate(83deg)',
                   filter: 'brightness(1.4)',
                   transition: 'all 2s ease',
                 }}
               />
             </div>

             {/* Animated Border Layer 4 */}
             <div
               style={{
                 position: 'absolute',
                 zIndex: -1,
                 overflow: 'hidden',
                 height: '100%',
                 width: '100%',
                 borderRadius: '50%',
                 filter: 'blur(0.5px)',
               }}
             >
               <div
                 style={{
                   position: 'absolute',
                   zIndex: -2,
                   width: '600px',
                   height: '600px',
                   background: 'conic-gradient(#1c191c, #DB0004 5%, #1c191c 14%, #1c191c 50%, #ff4d4d 60%, #1c191c 64%)',
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%) rotate(70deg)',
                   filter: 'brightness(1.3)',
                   transition: 'all 2s ease',
                 }}
               />
             </div>

             {/* Electric Crackle Effects */}
             <div
               style={{
                 position: 'absolute',
                 top: '-5px',
                 right: '-5px',
                 width: '8px',
                 height: '8px',
                 background: 'radial-gradient(circle, #FF0000, #8B0000)',
                 borderRadius: '50%',
                 animation: 'electricCrackle 1.5s ease-in-out infinite',
                 zIndex: 1,
               }}
             />
             <div
               style={{
                 position: 'absolute',
                 bottom: '-3px',
                 left: '-3px',
                 width: '6px',
                 height: '6px',
                 background: 'radial-gradient(circle, #FF4500, #8B0000)',
                 borderRadius: '50%',
                 animation: 'electricCrackle 2s ease-in-out infinite 0.5s',
                 zIndex: 1,
               }}
             />
             <div
               style={{
                 position: 'absolute',
                 top: '10px',
                 left: '-8px',
                 width: '4px',
                 height: '4px',
                 background: 'radial-gradient(circle, #DC143C, #8B0000)',
                 borderRadius: '50%',
                 animation: 'electricCrackle 1.8s ease-in-out infinite 1s',
                 zIndex: 1,
               }}
             />

             {/* Main Button */}
             <div
               style={{
                 position: 'relative',
                 background: 'radial-gradient(circle, #8B0000, #660000, #4A0000)',
                 border: '2px solid #B22222',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 width: '100%',
                 height: '100%',
                 minWidth: BUTTON_SIZE,
                 minHeight: BUTTON_SIZE,
                 boxShadow: `
                   0 0 20px rgba(139, 0, 0, 0.8),
                   0 0 40px rgba(178, 34, 34, 0.6),
                   0 0 60px rgba(220, 20, 60, 0.4),
                   inset 0 0 20px rgba(255, 0, 0, 0.2)
                 `,
                 animation: 'electricPulse 2s ease-in-out infinite alternate',
               }}
             >
               {/* AI Icon */}
               <motion.div
                 animate={{ 
                   rotate: isDragging ? 360 : 0,
                   scale: 1 
                 }}
                 transition={{ 
                   rotate: { duration: 0.6, ease: "easeInOut" },
                   scale: { duration: 0.15, ease: "easeOut" }
                 }}
                 style={{
                   userSelect: 'none',
                   pointerEvents: 'none',
                   zIndex: 2,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                 }}
               >
                 <img
                   src={aiIcon}
                   alt="AI Assistant"
                   style={{
                     width: isMobile ? '24px' : '28px',
                     height: isMobile ? '24px' : '28px',
                     filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))',
                     objectFit: 'contain',
                   }}
                 />
               </motion.div>

               {/* Animated Spinner */}
               <div
                 style={{
                   position: 'absolute',
                   height: '100%',
                   width: '100%',
                   overflow: 'hidden',
                   borderRadius: '50%',
                 }}
               >
                 <div
                   style={{
                     position: 'absolute',
                     width: '600px',
                     height: '600px',
                     background: 'conic-gradient(rgba(0,0,0,0), #3d3a4f, rgba(0,0,0,0) 50%, rgba(0,0,0,0) 50%, #3d3a4f, rgba(0,0,0,0) 100%)',
                     top: '50%',
                     left: '50%',
                     transform: 'translate(-50%, -50%) rotate(90deg)',
                     filter: 'brightness(1.35)',
                     animation: 'spin-slow 3s linear infinite',
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
            height: '44px',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0 12px'
            }}>
              <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: '8px' }}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ai-chat-orb"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #DB0004, #ff4d4d)',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                  }}
                />
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
                  background: '#DB0004',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  cursor: 'grab',
                  userSelect: 'none',
                  borderRadius: '4px 4px 0 0',
                }}
                onMouseDown={handleChatMouseDown}
                onTouchStart={handleChatTouchStart}
              >
                {/* Left side - AI Icon and Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #ffffff, #f0f0f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)',
                  }}>
                    <img
                      src={aiIcon}
                      alt="AI"
                      style={{
                        width: '12px',
                        height: '12px',
                        filter: 'brightness(0) saturate(100%) invert(13%) sepia(94%) saturate(7151%) hue-rotate(0deg) brightness(95%) contrast(118%)',
                      }}
                    />
                  </div>
                  <span style={{
                    color: '#ffffff',
                    fontFamily: 'var(--font-primary)',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    AI CHAT
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
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ×
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
                      borderRadius: '12px',
                      background: message.isUser ? '#DB0004' : '#1a1a1a',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      border: message.isUser ? 'none' : '1px solid #333',
                    }}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: '#1a1a1a',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      border: '1px solid #333',
                    }}>
                      AI is thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div style={{
                padding: '16px',
                background: '#000000',
                borderTop: '1px solid #333',
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
                      background: inputType === 'text' ? '#DB0004' : 'transparent',
                      border: '1px solid #DB0004',
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('voice')}
                    style={{
                      padding: '6px 12px',
                      background: inputType === 'voice' ? '#DB0004' : 'transparent',
                      border: '1px solid #DB0004',
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Voice
                  </button>
                </div>

                {/* Response Type Toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ color: '#ffffff', fontSize: '0.75rem', alignSelf: 'center' }}>
                    Response:
                  </span>
                  <button
                    type="button"
                    onClick={() => setResponseType('text')}
                    style={{
                      padding: '4px 8px',
                      background: responseType === 'text' ? '#DB0004' : 'transparent',
                      border: '1px solid #DB0004',
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseType('voice')}
                    style={{
                      padding: '4px 8px',
                      background: responseType === 'voice' ? '#DB0004' : 'transparent',
                      border: '1px solid #DB0004',
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Voice
                  </button>
                </div>

                {/* Text Input */}
                {inputType === 'text' && (
                  <form onSubmit={handleTextSubmit}>
                    <textarea
                      ref={textareaRef}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        height: '60px',
                        resize: 'none',
                        outline: 'none',
                        background: 'transparent',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontFamily: 'var(--font-primary)',
                        fontSize: '0.875rem',
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
                        background: '#DB0004',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      {isLoading ? 'Sending...' : 'Send'}
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
                        borderRadius: '50%',
                        background: isRecording ? '#ff4444' : '#DB0004',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '24px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                      }}
                    >
                      {isRecording ? '⏹️' : '🎤'}
                    </button>
                    <p style={{
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      marginTop: '8px',
                      opacity: 0.7,
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
