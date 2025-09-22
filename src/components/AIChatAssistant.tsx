import React from "react"
import { AnimatePresence, motion } from "framer-motion"

interface AIChatAssistantProps {
  className?: string
}

interface Position {
  x: number
  y: number
}

/**
 * AI Chat Assistant Component
 * A draggable circular chat interface with long-press functionality
 */
const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ className = '' }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const dragRef = React.useRef<HTMLDivElement>(null)
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = React.useRef(false)
  const wasDraggingRef = React.useRef(false)
  const dragStartRef = React.useRef<Position>({ x: 0, y: 0 })
  const initialPositionRef = React.useRef<Position>({ x: 0, y: 0 })

  const [showForm, setShowForm] = React.useState(false)
  const [, setSuccessFlag] = React.useState(false)
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

  // Calculate responsive dimensions
  const isMobile = windowSize.width < 768
  const FORM_WIDTH = isMobile ? 320 : 360
  const FORM_HEIGHT = isMobile ? 180 : 200
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


  const handleSuccess = React.useCallback(() => {
    triggerClose()
    setSuccessFlag(true)
    setTimeout(() => setSuccessFlag(false), 1500)
  }, [triggerClose])

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
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initialPositionRef.current = { ...position }
    
    longPressTimerRef.current = setTimeout(() => {
      setIsDragging(true)
      isDraggingRef.current = true
    }, 500) // 500ms for long press
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
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, initialPositionRef.current.x + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, initialPositionRef.current.y + deltaY))
      }
      setPosition(newPosition)
    }
  }, [])

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
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStartRef.current.x
      const deltaY = touch.clientY - dragStartRef.current.y
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, initialPositionRef.current.x + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, initialPositionRef.current.y + deltaY))
      }
      setPosition(newPosition)
    }
  }, [])

  const handleTouchEnd = React.useCallback(() => {
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
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', () => handleMouseUp())
      document.addEventListener('touchmove', handleTouchMove)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handleSuccess()
  }

  const handleKeys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") triggerClose()
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (
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
          border: showForm ? '1px solid var(--border-accent)' : 'none',
          boxShadow: showForm ? 'var(--shadow-glow)' : 'none',
          borderRadius: showForm ? '14px' : '50%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          cursor: showForm ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          userSelect: 'none',
        }}
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : BUTTON_SIZE,
          height: showForm ? FORM_HEIGHT : BUTTON_SIZE,
          scale: isDragging ? 1.15 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8,
          delay: showForm ? 0 : 0.05,
        }}
      >
        {/* Circular Button - Only show when form is closed */}
        {!showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 400, damping: 25 }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle, #DB0004, #ff4d4d)',
              borderRadius: '50%',
              boxShadow: isDragging 
                ? '0 0 25px rgba(239, 68, 68, 0.9), 0 0 50px rgba(239, 68, 68, 0.5)' 
                : '0 0 12px rgba(239, 68, 68, 0.6)',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
            }}
            onClick={handleButtonClick}
            onMouseDown={handleButtonMouseDown}
            onTouchStart={handleButtonTouchStart}
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
                color: 'white',
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: 'bold',
                textShadow: '0 0 12px rgba(0,0,0,0.6)',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              AI
            </motion.div>
            
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

        {/* Input Form - Only show when form is open */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              position: 'absolute',
              bottom: 0,
              width: FORM_WIDTH,
              height: FORM_HEIGHT,
              pointerEvents: "all"
            }}
          >
            {/* Draggable Header */}
            <div
              style={{
                height: '32px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                cursor: 'grab',
                userSelect: 'none',
                borderRadius: '14px 14px 0 0',
              }}
              onMouseDown={handleChatMouseDown}
              onTouchStart={handleChatTouchStart}
            >
              <div
                style={{
                  width: '20px',
                  height: '4px',
                  background: 'var(--border-accent)',
                  borderRadius: '2px',
                }}
              />
              
              {/* Minimize Button */}
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
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-primary)'
                  e.currentTarget.style.color = 'var(--text-accent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
              >
                ×
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 550, damping: 45, mass: 0.7 }}
              style={{
                display: 'flex',
                height: 'calc(100% - 32px)',
                flexDirection: 'column',
                padding: '4px'
              }}
            >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '4px'
                }}>
                  <p style={{
                    color: 'var(--text-primary)',
                    zIndex: 2,
                    marginLeft: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    userSelect: 'none',
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    margin: 0,
                  }}>
                    AI Input
                  </p>
                  <button
                    type="submit"
                    style={{
                      color: 'var(--text-primary)',
                      right: '16px',
                      marginTop: '4px',
                      display: 'flex',
                      transform: 'translateY(-3px)',
                      cursor: 'pointer',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      borderRadius: '12px',
                      background: 'transparent',
                      paddingRight: '4px',
                      textAlign: 'center',
                      userSelect: 'none',
                      border: 'none',
                      transition: 'all var(--transition-normal)',
                    }}
                  >
                    <kbd style={{
                      color: 'var(--text-primary)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      display: 'flex',
                      height: '24px',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      ⌘
                    </kbd>
                    <kbd style={{
                      color: 'var(--text-primary)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      display: 'flex',
                      height: '24px',
                      width: 'fit-content',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      Enter
                    </kbd>
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  placeholder="Ask me anything about sports betting, matches, or predictions..."
                  name="message"
                  className="ai-chat-textarea"
                  style={{
                    height: '100%',
                    width: '100%',
                    resize: 'none',
                    scrollPaddingTop: '8px',
                    scrollPaddingBottom: '8px',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    outline: 'none',
                    background: 'var(--bg-secondary)',
                    border: '2px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.875rem',
                    transition: 'all var(--transition-normal)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--border-accent)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-primary)'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                  onKeyDown={handleKeys}
                  spellCheck={false}
                />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: '8px',
                left: '12px'
              }}
            >
              <div
                className="ai-chat-orb"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #DB0004, #ff4d4d)',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                }}
              />
            </motion.div>
          </form>
        )}
      </motion.div>
    </div>
  )
}

export default AIChatAssistant
