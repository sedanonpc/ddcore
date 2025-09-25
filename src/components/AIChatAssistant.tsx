import React from "react"
import { motion } from "framer-motion"
import { BorderRotate } from "./ui/BorderRotate"
import aiIcon from "../assets/images/ICON@10x.png"
import hellracerBanner from "../assets/images/hellracer banner 2.svg"
import BlobBackground from "./BlobBackground"
import { blockchainService } from "../services/blockchain"
import { mcpService, BettingIntent, QuestionFlow, MCPResponse } from "../services/mcpService"
import { llmService } from "../services/llmService"
import ExpertAdviceModal from "./ExpertAdviceModal"
import { useSimpleBettingHandler } from "./SimpleBettingHandler"

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

// Error Code System for Debugging
enum ChatErrorCode {
  // Authentication Errors (1xx)
  USER_NOT_AUTHENTICATED = 'AUTH_001',
  WALLET_NOT_CONNECTED = 'AUTH_002',
  USER_DATA_MISSING = 'AUTH_003',
  
  // Backend Connection Errors (2xx)
  BACKEND_NOT_RUNNING = 'BACKEND_001',
  BACKEND_CONNECTION_TIMEOUT = 'BACKEND_002',
  BACKEND_CORS_ERROR = 'BACKEND_003',
  BACKEND_INVALID_RESPONSE = 'BACKEND_004',
  BACKEND_SERVER_ERROR = 'BACKEND_005',
  
  // Input Validation Errors (3xx)
  EMPTY_MESSAGE = 'INPUT_001',
  MESSAGE_TOO_LONG = 'INPUT_002',
  INVALID_MESSAGE_TYPE = 'INPUT_003',
  
  // Voice Recording Errors (4xx)
  MICROPHONE_PERMISSION_DENIED = 'VOICE_001',
  MICROPHONE_NOT_AVAILABLE = 'VOICE_002',
  RECORDING_START_FAILED = 'VOICE_003',
  RECORDING_STOP_FAILED = 'VOICE_004',
  AUDIO_PROCESSING_FAILED = 'VOICE_005',
  
  // State Management Errors (5xx)
  LOADING_STATE_STUCK = 'STATE_001',
  RECORDING_STATE_STUCK = 'STATE_002',
  FORM_STATE_INCONSISTENT = 'STATE_003',
  
  // Network Errors (6xx)
  NETWORK_OFFLINE = 'NETWORK_001',
  NETWORK_TIMEOUT = 'NETWORK_002',
  NETWORK_UNKNOWN_ERROR = 'NETWORK_003'
}

interface ChatError {
  code: ChatErrorCode
  message: string
  details?: any
  timestamp: Date
}

/**
 * AI Chat Assistant Component
 * Lean message relay to Telegram-compatible LLM backend
 */
const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ className = '' }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
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
  const [isRecording, setIsRecording] = React.useState(false)
  const [isVoiceDetected, setIsVoiceDetected] = React.useState(false)
  const [sessionId] = React.useState(() => `session_${Date.now()}_${Math.random()}`)
  const [errors, setErrors] = React.useState<ChatError[]>([])
  const [debugMode, setDebugMode] = React.useState(false)
  const voiceRecordingTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const voiceDetectionTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // MCP-specific state
  const [bettingIntent, setBettingIntent] = React.useState<Partial<BettingIntent>>({})
  const [questionFlow, setQuestionFlow] = React.useState<QuestionFlow | null>(null)
  const [showExpertAdvice, setShowExpertAdvice] = React.useState(false)
  const [bettingContext, setBettingContext] = React.useState<any>(null)

  // Simple betting handler (bypasses MCP complexity)
  const { handleSimpleBetRequest } = useSimpleBettingHandler({ setMessages, setIsLoading })

  // Function to convert URLs in text to clickable links
  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent-cyan)',
              textDecoration: 'underline',
              cursor: 'pointer',
              wordBreak: 'break-all'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  // Calculate responsive dimensions with accessibility considerations
  const isMobile = windowSize.width < 768
  const FORM_WIDTH = isMobile ? 320 : 400
  const FORM_HEIGHT = isMobile ? 500 : 600
  const BUTTON_SIZE = isMobile ? 56 : 60 // Minimum 44px touch target

  // Memoize expensive calculations
  const memoizedDimensions = React.useMemo(() => ({
    isMobile,
    FORM_WIDTH,
    FORM_HEIGHT,
    BUTTON_SIZE
  }), [isMobile, FORM_WIDTH, FORM_HEIGHT, BUTTON_SIZE])


  // Error handling utilities
  const addError = React.useCallback((code: ChatErrorCode, message: string, details?: any) => {
    const error: ChatError = {
      code,
      message,
      details,
      timestamp: new Date()
    }
    setErrors(prev => [...prev, error])
    console.error(`[${code}] ${message}`, details)
  }, [])

  const clearErrors = React.useCallback(() => {
    setErrors([])
  }, [])

  const getErrorMessage = React.useCallback((code: ChatErrorCode): string => {
    switch (code) {
      case ChatErrorCode.USER_NOT_AUTHENTICATED:
        return '🔐 Please connect your wallet to use the AI assistant'
      case ChatErrorCode.BACKEND_NOT_RUNNING:
        return '🚫 Backend server is not running. Please start the LLM backend at http://127.0.0.1:8001'
      case ChatErrorCode.BACKEND_CONNECTION_TIMEOUT:
        return '⏱️ Connection to backend timed out. Check if server is running.'
      case ChatErrorCode.BACKEND_CORS_ERROR:
        return '🔧 CORS error - backend server configuration issue'
      case ChatErrorCode.MICROPHONE_PERMISSION_DENIED:
        return '🎤 Microphone permission denied. Please allow microphone access in your browser settings.'
      case ChatErrorCode.MICROPHONE_NOT_AVAILABLE:
        return '🎤 Microphone not available on this device'
      case ChatErrorCode.RECORDING_START_FAILED:
        return '🎙️ Failed to start voice recording. Please try again.'
      case ChatErrorCode.RECORDING_STOP_FAILED:
        return '🎙️ Failed to stop voice recording. Please try again.'
      case ChatErrorCode.NETWORK_OFFLINE:
        return '🌐 No internet connection available. Please check your connection.'
      case ChatErrorCode.EMPTY_MESSAGE:
        return '📝 Please enter a message before sending.'
      case ChatErrorCode.MESSAGE_TOO_LONG:
        return '📏 Message is too long. Please keep it under 4000 characters.'
      default:
        return '❌ An unexpected error occurred. Please try again.'
    }
  }, [])

  // MCP Protocol Methods
  const processBettingIntent = React.useCallback(async (message: string): Promise<void> => {
    console.log('🚀 === BETTING INTENT PROCESSING START ===')
    console.log('📝 Message:', message)
    
    try {
      // Check user authentication first
      const user = blockchainService.getCurrentUser()
      console.log('🔍 User check:', { hasUser: !!user, user })
      
      if (!user) {
        console.log('❌ CRITICAL: No user found - throwing error')
        throw new Error('🔐 Please connect your wallet first to place bets')
      }

      // Check blockchain initialization
      let isInitialized = blockchainService.isInitialized()
      console.log('🔍 Blockchain initialized:', isInitialized)
      
      if (!isInitialized) {
        console.log('🔍 Attempting to restore blockchain connection...')
        const restored = await blockchainService.restoreConnection()
        console.log('🔍 Restore result:', restored)
        
        if (!restored) {
          console.log('❌ CRITICAL: Could not restore blockchain connection - throwing error')
          throw new Error('🔗 Wallet not properly connected. Please reconnect your MetaMask wallet.')
        }
        
        isInitialized = blockchainService.isInitialized()
        console.log('🔍 Blockchain initialized after restore:', isInitialized)
      }
      
      console.log('✅ Validation passed, proceeding with MCP flow...')
      
      // Parse natural language into betting intent
      const intent = await mcpService.parseBettingIntent(message)
      setBettingIntent(intent)

      const context = {
        userId: user.walletAddress,
        intent,
        matches: [],
        availableCompetitors: {},
        riskAssessment: { level: 'low' as const, factors: [], recommendation: '', confidence: 0 }
      }

      setBettingContext(context)

      // Generate guiding questions
      const questionFlow = await mcpService.generateNextQuestion(context)
      setQuestionFlow(questionFlow)

      // Check if we can proceed directly with bet creation
      if (questionFlow.canProceed) {
        console.log('✅ All information collected, proceeding with bet creation...')
        await executeAutonomousBet(intent as BettingIntent)
      } else if (questionFlow.questions.length > 0) {
        // Add AI response with guiding questions
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          content: questionFlow.questions[0].question,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, aiMessage])
      }

    } catch (error) {
      console.error('❌ BETTING INTENT FAILED:', error)
      
      // Show the REAL error instead of falling back
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: `🚨 **BET CREATION FAILED**\n\n${error instanceof Error ? error.message : String(error)}\n\n🔧 **Debug Info:**\n- User in localStorage: ${!!blockchainService.getCurrentUser()}\n- Blockchain initialized: ${blockchainService.isInitialized()}\n- MetaMask available: ${!!(window as any).ethereum}`,
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
      
      // Don't let it fall through to LLM
      return
    }
  }, [addError])

  const answerGuidingQuestion = React.useCallback(async (questionId: string, answer: string): Promise<void> => {
    if (!questionFlow || !bettingContext) return

    try {
      // Use MCP service to process the answer
      const result = await mcpService.processQuestionAnswer(bettingContext, questionId, answer)
      
      // Update local state with the updated context
      setBettingContext(result.updatedContext)
      setBettingIntent(result.updatedContext.intent)

      if (result.canProceed) {
        // All information collected, proceed with bet creation
        await executeAutonomousBet(result.updatedContext.intent as BettingIntent)
      } else if (result.nextQuestion) {
        // Ask the next question
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          content: result.nextQuestion.question,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, aiMessage])
        
        // Update question flow state
        setQuestionFlow({
          questions: [result.nextQuestion],
          context: result.updatedContext,
          completionPercentage: mcpService['calculateCompletionPercentage'](result.updatedContext.intent),
          canProceed: result.canProceed,
          currentQuestionIndex: 0
        })
      }

    } catch (error) {
      console.error('Failed to process question answer:', error)
      addError(ChatErrorCode.BACKEND_INVALID_RESPONSE, 'Failed to process your answer')
    }
  }, [bettingContext, questionFlow, addError])

  const executeAutonomousBet = React.useCallback(async (intent: BettingIntent): Promise<void> => {
    if (!bettingContext) return

    setIsLoading(true)

    try {
      // Generate expert advice first
      const expertAdvice = await mcpService.generateExpertAdvice(bettingContext)

      // Show expert advice modal if risk is high
      if (expertAdvice.riskLevel === 'high' || expertAdvice.riskLevel === 'extreme') {
        setShowExpertAdvice(true)
        return
      }

      // Create autonomous match if needed
      let match = bettingContext.matches[0]
      if (!match) {
        const matchCriteria = {
          sport: intent.sport,
          teams: [intent.competitor]
        }
        match = await mcpService.createAutonomousMatch(matchCriteria)
      }

      // Create bet autonomously
      const mcpResponse = await mcpService.createAutonomousBet(intent, match)

      if (mcpResponse.success) {
        // Success confirmation message
        const successMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          content: `✅ **BET CREATED SUCCESSFULLY!**\n\n🏆 **Bet ID:** ${mcpResponse.data?.betId}\n💎 **NFT Token ID:** ${mcpResponse.data?.nftTokenId}`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, successMessage])

        // Transaction details with Core Explorer link
        if (mcpResponse.data?.transactionHash) {
          const txMessage: ChatMessage = {
            id: `ai_tx_${Date.now()}`,
            content: `🔗 **TRANSACTION CONFIRMED ON-CHAIN**\n\n📋 **Transaction ID:** ${mcpResponse.data.transactionHash}\n\n🔍 **View on Core Explorer:** https://scan.test2.btcs.network/tx/${mcpResponse.data.transactionHash}\n\n✨ Your bet is now permanently recorded on the blockchain!`,
            type: 'text',
            timestamp: new Date(),
            isUser: false
          }
          setMessages(prev => [...prev, txMessage])
        }

        // Bet acceptance page and sharing info
        if (mcpResponse.data?.shareableUrl) {
          const shareMessage: ChatMessage = {
            id: `ai_share_${Date.now()}`,
            content: `🎯 **BET ACCEPTANCE PAGE**\n\n📱 **Share this link with friends to accept your bet:**\n${mcpResponse.data.shareableUrl}\n\n📲 **QR Code:** Available for easy sharing\n\n🎲 Once someone accepts, the bet will be locked and ready for resolution!`,
            type: 'text',
            timestamp: new Date(),
            isUser: false
          }
          setMessages(prev => [...prev, shareMessage])
        }

        // Instructions for next steps
        const instructionsMessage: ChatMessage = {
          id: `ai_instructions_${Date.now()}`,
          content: `🎮 **WHAT HAPPENS NEXT?**\n\n1️⃣ Share the bet link with friends\n2️⃣ Wait for someone to accept the challenge\n3️⃣ Watch the match/game\n4️⃣ Bet resolves automatically based on results\n\n💰 Winner takes the full pot! Good luck! 🍀`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, instructionsMessage])

        // Reset betting state
        setBettingIntent({})
        setQuestionFlow(null)
        setBettingContext(null)

      } else {
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          content: mcpResponse.message || 'Failed to create bet',
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, errorMessage])
      }

    } catch (error) {
      console.error('Failed to execute autonomous bet:', error)
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: 'Failed to create bet. Please try again.',
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [bettingContext])

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
    
    // Stop any active recording when closing
    if (isRecording && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
      } catch (error) {
        console.warn('Error stopping recording on close:', error)
        setIsRecording(false)
      }
    }
    
    // Clear any pending voice recording timer
    if (voiceRecordingTimerRef.current) {
      clearTimeout(voiceRecordingTimerRef.current)
      voiceRecordingTimerRef.current = null
    }
    
    // Reset button position to default (lower right)
    const isMobile = window.innerWidth < 768
    const defaultX = window.innerWidth - (isMobile ? 80 : 100)
    const defaultY = window.innerHeight - (isMobile ? 80 : 100)
    setPosition({ x: defaultX, y: defaultY })
  }, [isRecording])

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = React.useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  // Auto-scroll when messages change
  React.useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Voice detection simulation during recording
  React.useEffect(() => {
    if (isRecording) {
      // Simulate voice detection with random intervals
      const simulateVoiceDetection = () => {
        if (Math.random() > 0.3) { // 70% chance of voice detection
          setIsVoiceDetected(true)
          
          // Clear previous timer
          if (voiceDetectionTimerRef.current) {
            clearTimeout(voiceDetectionTimerRef.current)
          }
          
          // Reset voice detection after random duration
          voiceDetectionTimerRef.current = setTimeout(() => {
            setIsVoiceDetected(false)
          }, Math.random() * 2000 + 500) // 0.5-2.5 seconds
        }
        
        // Schedule next detection
        setTimeout(simulateVoiceDetection, Math.random() * 1000 + 200) // 0.2-1.2 seconds
      }
      
      simulateVoiceDetection()
    } else {
      // Stop voice detection when not recording
      setIsVoiceDetected(false)
      if (voiceDetectionTimerRef.current) {
        clearTimeout(voiceDetectionTimerRef.current)
      }
    }
    
    return () => {
      if (voiceDetectionTimerRef.current) {
        clearTimeout(voiceDetectionTimerRef.current)
      }
    }
  }, [isRecording])

  // Simple click handler for button - open chat
  const handleButtonClick = React.useCallback(() => {
    // Only open chat if we haven't been dragging
    if (!showForm && !wasDraggingRef.current) {
      // Center the chat window when opening
      const centerX = (window.innerWidth - memoizedDimensions.FORM_WIDTH) / 2
      const centerY = (window.innerHeight - memoizedDimensions.FORM_HEIGHT) / 2
      setPosition({ x: centerX, y: centerY })
      
      setShowForm(true)
      setTimeout(() => {
        textareaRef.current?.focus()
      })
    }
    // Reset the wasDragging flag after click
    wasDraggingRef.current = false
  }, [showForm, memoizedDimensions.FORM_WIDTH, memoizedDimensions.FORM_HEIGHT])

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
        x: Math.max(0, Math.min(window.innerWidth - memoizedDimensions.BUTTON_SIZE, newX)),
        y: Math.max(0, Math.min(window.innerHeight - memoizedDimensions.BUTTON_SIZE, newY))
      }
      
      setPosition(newPosition)
    }
  }, [memoizedDimensions.BUTTON_SIZE])

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
      const centerX = (window.innerWidth - memoizedDimensions.FORM_WIDTH) / 2
      const centerY = (window.innerHeight - memoizedDimensions.FORM_HEIGHT) / 2
      setPosition({ x: centerX, y: centerY })
      
      setShowForm(true)
      setTimeout(() => {
        textareaRef.current?.focus()
      })
    }
    
    // Reset the wasDragging flag after touch end
    wasDraggingRef.current = false
  }, [showForm, memoizedDimensions.FORM_WIDTH, memoizedDimensions.FORM_HEIGHT])

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
        x: Math.max(0, Math.min(window.innerWidth - memoizedDimensions.BUTTON_SIZE, newX)),
        y: Math.max(0, Math.min(window.innerHeight - memoizedDimensions.BUTTON_SIZE, newY))
      }
      
      setPosition(newPosition)
    }
  }, [memoizedDimensions.BUTTON_SIZE])

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
        x: Math.min(prev.x, window.innerWidth - memoizedDimensions.BUTTON_SIZE),
        y: Math.min(prev.y, window.innerHeight - memoizedDimensions.BUTTON_SIZE)
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [memoizedDimensions.BUTTON_SIZE])

  React.useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler)
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [showForm, triggerClose])

  // Cleanup voice recording timers and state
  React.useEffect(() => {
    return () => {
      // Clear any pending voice recording timer
      if (voiceRecordingTimerRef.current) {
        clearTimeout(voiceRecordingTimerRef.current)
        voiceRecordingTimerRef.current = null
      }
      
      // Stop any active recording
      if (mediaRecorderRef.current && isRecording) {
        try {
          mediaRecorderRef.current.stop()
        } catch (error) {
          console.warn('Error stopping media recorder on cleanup:', error)
        }
      }
    }
  }, [isRecording])

  // Additional cleanup when recording state changes
  React.useEffect(() => {
    if (!isRecording && mediaRecorderRef.current) {
      // Ensure media recorder is properly stopped
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      } catch (error) {
        console.warn('Error stopping media recorder on state change:', error)
      }
    }
  }, [isRecording])

  /**
   * Send message to Telegram-compatible backend
   */
  const sendMessageToBackend = React.useCallback(async (content: string, type: 'text' | 'voice', audioBlob?: Blob): Promise<ChatResponse> => {
    // Validate user authentication
    const user = blockchainService.getCurrentUser()
    if (!user) {
      addError(ChatErrorCode.USER_NOT_AUTHENTICATED, 'User not authenticated', { 
        hasUser: false,
        timestamp: new Date().toISOString()
      })
      throw new Error(`[${ChatErrorCode.USER_NOT_AUTHENTICATED}] User not authenticated`)
    }

    if (!user.walletAddress) {
      addError(ChatErrorCode.USER_DATA_MISSING, 'User wallet address missing', {
        hasWalletAddress: false,
        hasUsername: !!user.username
      })
      throw new Error(`[${ChatErrorCode.USER_DATA_MISSING}] User wallet address missing`)
    }

    // Validate input
    if (!content || content.trim().length === 0) {
      addError(ChatErrorCode.EMPTY_MESSAGE, 'Empty message content', {
        contentLength: content?.length || 0
      })
      throw new Error(`[${ChatErrorCode.EMPTY_MESSAGE}] Empty message content`)
    }

    if (content.length > 4000) {
      addError(ChatErrorCode.MESSAGE_TOO_LONG, 'Message too long', {
        contentLength: content.length,
        maxLength: 4000
      })
      throw new Error(`[${ChatErrorCode.MESSAGE_TOO_LONG}] Message too long`)
    }

    // Check network connectivity
    if (!navigator.onLine) {
      addError(ChatErrorCode.NETWORK_OFFLINE, 'No internet connection')
      throw new Error(`[${ChatErrorCode.NETWORK_OFFLINE}] No internet connection`)
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

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`http://127.0.0.1:8001/chat`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          timestamp: new Date().toISOString()
        }

        if (response.status >= 500) {
          addError(ChatErrorCode.BACKEND_SERVER_ERROR, `Backend server error: ${response.status}`, errorDetails)
          throw new Error(`[${ChatErrorCode.BACKEND_SERVER_ERROR}] Backend server error: ${response.status}`)
        } else if (response.status === 0 || response.status === 404) {
          addError(ChatErrorCode.BACKEND_NOT_RUNNING, 'Backend server not running', errorDetails)
          throw new Error(`[${ChatErrorCode.BACKEND_NOT_RUNNING}] Backend server not running`)
        } else {
          addError(ChatErrorCode.BACKEND_INVALID_RESPONSE, `Invalid response: ${response.status}`, errorDetails)
          throw new Error(`[${ChatErrorCode.BACKEND_INVALID_RESPONSE}] Invalid response: ${response.status}`)
        }
      }

      const result = await response.json()
      return result

    } catch (error) {
      const errorObj = error as Error
      if (errorObj.name === 'AbortError') {
        addError(ChatErrorCode.BACKEND_CONNECTION_TIMEOUT, 'Connection timeout', {
          timeout: 10000,
          timestamp: new Date().toISOString()
        })
        throw new Error(`[${ChatErrorCode.BACKEND_CONNECTION_TIMEOUT}] Connection timeout`)
      } else if (errorObj instanceof TypeError && errorObj.message.includes('fetch')) {
        addError(ChatErrorCode.BACKEND_NOT_RUNNING, 'Backend server not accessible', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        throw new Error(`[${ChatErrorCode.BACKEND_NOT_RUNNING}] Backend server not accessible`)
      } else if (errorObj.message.includes('CORS')) {
        addError(ChatErrorCode.BACKEND_CORS_ERROR, 'CORS error', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        throw new Error(`[${ChatErrorCode.BACKEND_CORS_ERROR}] CORS error`)
      } else {
        addError(ChatErrorCode.NETWORK_UNKNOWN_ERROR, 'Unknown network error', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        throw new Error(`[${ChatErrorCode.NETWORK_UNKNOWN_ERROR}] Unknown network error`)
      }
    }
  }, [addError, sessionId])

  /**
   * Stop voice recording and send
   */
  const stopVoiceRecording = React.useCallback(() => {
    console.log('Stopping voice recording...', { 
      hasMediaRecorder: !!mediaRecorderRef.current, 
      isRecording,
      recorderState: mediaRecorderRef.current?.state 
    })
    
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
          console.log('MediaRecorder stop() called')
        } else {
          console.log('MediaRecorder not in recording state:', mediaRecorderRef.current.state)
          setIsRecording(false)
          mediaRecorderRef.current = null
        }
      } catch (error) {
        const errorObj = error as Error
        addError(ChatErrorCode.RECORDING_STOP_FAILED, 'Failed to stop recording', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        setIsRecording(false)
        mediaRecorderRef.current = null
        console.error('Error stopping recording:', error)
      }
    } else if (isRecording) {
      // State inconsistency detected - force reset
      addError(ChatErrorCode.RECORDING_STATE_STUCK, 'Recording state inconsistent', {
        hasMediaRecorder: !!mediaRecorderRef.current,
        isRecording,
        timestamp: new Date().toISOString()
      })
      setIsRecording(false)
      mediaRecorderRef.current = null
      console.warn('Force reset recording state due to inconsistency')
    }
  }, [isRecording, addError])


  /**
   * Handle text message submission
   */
  const handleTextSubmit = React.useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault()
    }

    const message = textareaRef.current?.value?.trim()
    if (!message || isLoading || isRecording) return

    // Clear input immediately to prevent double submission
    if (textareaRef.current) {
      textareaRef.current.value = ''
    }

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
      // Check if this is a betting-related query (MCP routing)
      const bettingKeywords = ['bet', 'wager', 'gamble', 'stake', 'risk', 'lakers', 'celtics', 'warriors', 'bulls', 'chiefs', 'eagles', 'cowboys', 'max verstappen', 'lewis hamilton']
      const isBettingQuery = bettingKeywords.some(keyword =>
        message.toLowerCase().includes(keyword.toLowerCase())
      )

      if (isBettingQuery) {
        // Use simple betting handler instead of complex MCP flow
        console.log('🎯 Using simple betting handler')
        await handleSimpleBetRequest(message)
        return // Don't continue to LLM fallback
      } else {
        // Regular chat message - try LLM first, then fallback to backend
        try {
          const llmResponse = await llmService.generateChatResponse(message, { 
            bettingContext: bettingContext,
            userHistory: messages.slice(-5) // Last 5 messages for context
          })
          
          if (llmResponse.success && llmResponse.data) {
            const aiMessage: ChatMessage = {
              id: `ai_${Date.now()}`,
              content: llmResponse.data,
              type: 'text',
              timestamp: new Date(),
              isUser: false
            }
            setMessages(prev => [...prev, aiMessage])
          } else {
            throw new Error('LLM response failed')
          }
        } catch (error) {
          console.warn('LLM chat failed, falling back to backend:', error)
          
          // Fallback to original backend
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
        }
      }
    } catch (error) {
      console.error('Chat error:', error)

      // Extract error code if available
      const errorObj = error as Error
      const errorCode = errorObj.message.match(/\[([A-Z_]+)\]/)?.[1]
      const userFriendlyMessage = errorCode ? getErrorMessage(errorCode as ChatErrorCode) : 'Sorry, I encountered an error. Please try again.'

      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: userFriendlyMessage,
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isRecording, sendMessageToBackend, getErrorMessage, questionFlow, answerGuidingQuestion, processBettingIntent])

  /**
   * Handle voice message submission
   */
  const handleVoiceSubmission = React.useCallback(async (audioBlob: Blob) => {
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
      
      // Extract error code if available
      const errorObj = error as Error
      const errorCode = errorObj.message.match(/\[([A-Z_]+)\]/)?.[1]
      const userFriendlyMessage = errorCode ? getErrorMessage(errorCode as ChatErrorCode) : 'Sorry, I encountered an error processing your voice message.'
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: userFriendlyMessage,
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sendMessageToBackend, getErrorMessage])

  /**
   * Start voice recording
   */
  const startVoiceRecording = React.useCallback(async () => {
    // Prevent multiple recordings
    if (isRecording) {
      console.warn('Already recording, ignoring start request')
      return
    }

    try {
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addError(ChatErrorCode.MICROPHONE_NOT_AVAILABLE, 'Media devices not available', {
          hasMediaDevices: !!navigator.mediaDevices,
          hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia)
        })
        throw new Error(`[${ChatErrorCode.MICROPHONE_NOT_AVAILABLE}] Media devices not available`)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      // Clear any existing media recorder
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
        } catch (e) {
          console.warn('Error stopping existing media recorder:', e)
        }
      }
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          await handleVoiceSubmission(audioBlob)
        } catch (error) {
          const errorObj = error as Error
          addError(ChatErrorCode.AUDIO_PROCESSING_FAILED, 'Failed to process audio', {
            error: errorObj.message,
            blobSize: audioChunksRef.current.length
          })
        } finally {
          stream.getTracks().forEach(track => track.stop())
          setIsRecording(false)
          mediaRecorderRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        const errorEvent = event as any // MediaRecorder error events have error property
        addError(ChatErrorCode.RECORDING_START_FAILED, 'MediaRecorder error', {
          error: errorEvent.error?.name || 'Unknown error'
        })
        setIsRecording(false)
        stream.getTracks().forEach(track => track.stop())
        mediaRecorderRef.current = null
      }

      mediaRecorder.start()
      setIsRecording(true)
      console.log('Voice recording started')
    } catch (error) {
      const errorObj = error as Error
      setIsRecording(false)
      mediaRecorderRef.current = null
      
      if (errorObj.name === 'NotAllowedError') {
        addError(ChatErrorCode.MICROPHONE_PERMISSION_DENIED, 'Microphone permission denied', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        throw new Error(`[${ChatErrorCode.MICROPHONE_PERMISSION_DENIED}] Microphone permission denied`)
      } else if (errorObj.name === 'NotFoundError') {
        addError(ChatErrorCode.MICROPHONE_NOT_AVAILABLE, 'No microphone found', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        throw new Error(`[${ChatErrorCode.MICROPHONE_NOT_AVAILABLE}] No microphone found`)
      } else {
        addError(ChatErrorCode.RECORDING_START_FAILED, 'Failed to start recording', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        throw new Error(`[${ChatErrorCode.RECORDING_START_FAILED}] Failed to start recording`)
      }
    }
  }, [isRecording, addError, handleVoiceSubmission])



  /**
   * Handle text send button click
   */
  const handleTextSend = React.useCallback(() => {
    const message = textareaRef.current?.value?.trim()
    if (message && !isLoading && !isRecording) {
      handleTextSubmit()
    }
  }, [isLoading, isRecording, handleTextSubmit])

  /**
   * Handle voice button mouse down - start voice recording
   */
  const handleVoiceMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isRecording && !isLoading) {
      startVoiceRecording()
    }
  }, [isRecording, isLoading, startVoiceRecording])

  /**
   * Handle voice button mouse up - stop voice recording
   */
  const handleVoiceMouseUp = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isRecording) {
      stopVoiceRecording()
    }
  }, [isRecording, stopVoiceRecording])

  /**
   * Handle voice button touch start - start voice recording
   */
  const handleVoiceTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isRecording && !isLoading) {
      startVoiceRecording()
    }
  }, [isRecording, isLoading, startVoiceRecording])

  /**
   * Handle voice button touch end - stop voice recording
   */
  const handleVoiceTouchEnd = React.useCallback(() => {
    if (isRecording) {
      stopVoiceRecording()
    }
  }, [isRecording, stopVoiceRecording])

  const handleKeys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      triggerClose()
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const message = textareaRef.current?.value?.trim()
      if (message && !isLoading && !isRecording) {
        handleTextSubmit()
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const message = textareaRef.current?.value?.trim()
      if (message && !isLoading && !isRecording) {
        handleTextSubmit()
      }
    }
  }

  // Keyboard shortcuts for voice recording
  const handleGlobalKeys = React.useCallback((e: KeyboardEvent) => {
    if (showForm && !isLoading) {
      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault()
        if (isRecording) {
          stopVoiceRecording()
        } else {
          startVoiceRecording()
        }
      }
    }
  }, [showForm, isLoading, isRecording, startVoiceRecording, stopVoiceRecording])

  // Add global keyboard listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeys)
    return () => document.removeEventListener('keydown', handleGlobalKeys)
  }, [handleGlobalKeys])

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
            ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(220, 38, 38, 0.3), var(--shadow-glow)' 
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
          width: showForm ? memoizedDimensions.FORM_WIDTH : memoizedDimensions.BUTTON_SIZE,
          height: showForm ? memoizedDimensions.FORM_HEIGHT : memoizedDimensions.BUTTON_SIZE,
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
             role="button"
             tabIndex={0}
             aria-label="Open AI Chat Assistant"
             aria-expanded={showForm}
             aria-describedby="ai-chat-description"
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
                 minWidth: memoizedDimensions.BUTTON_SIZE,
                 minHeight: memoizedDimensions.BUTTON_SIZE,
                 boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 0, 0, 0.1)',
                 fontFamily: 'var(--font-primary)',
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
                     width: memoizedDimensions.isMobile ? '28px' : '32px',
                     height: memoizedDimensions.isMobile ? '28px' : '32px',
                     filter: 'brightness(0) invert(1) drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))',
                     objectFit: 'contain',
                     transition: 'all 0.3s ease',
                     zIndex: 2,
                   }}
                 />
                 
                 {/* Screen reader description */}
                 <div id="ai-chat-description" style={{ display: 'none' }}>
                   AI Chat Assistant. Click to open chat interface. Long press and drag to move position. 
                   {isRecording && ' Currently recording voice message.'}
                   {isLoading && ' Processing your message.'}
                 </div>
                 
                 {/* Subtle Glow Effect */}
                 <div
                   style={{
                     position: 'absolute',
                     top: '50%',
                     left: '50%',
                     transform: 'translate(-50%, -50%)',
                     width: memoizedDimensions.isMobile ? '32px' : '36px',
                     height: memoizedDimensions.isMobile ? '32px' : '36px',
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
                     width: memoizedDimensions.isMobile ? '40px' : '44px',
                     height: memoizedDimensions.isMobile ? '40px' : '44px',
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
            background: 'var(--bg-secondary)',
            border: 'none',
            borderTop: '1px solid var(--border-primary)',
            borderRadius: '0 0 8px 8px',
            fontFamily: 'var(--font-primary)',
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
                    background: '#10b981',
                    borderRadius: '50%',
                    animation: 'consoleBlink 2s ease-in-out infinite',
                  }}
                />
                <span style={{
                  color: 'var(--text-muted)',
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
                width: memoizedDimensions.FORM_WIDTH,
                height: memoizedDimensions.FORM_HEIGHT,
                pointerEvents: "all",
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-red)',
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
                background: 'linear-gradient(to bottom, var(--accent-red), transparent)',
                zIndex: 1,
              }} />
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(to bottom, var(--accent-red), transparent)',
                zIndex: 1,
              }} />
              {/* Header Bar */}
              <div
                style={{
                  height: '44px',
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  borderBottom: '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  cursor: 'grab',
                  userSelect: 'none',
                  borderRadius: '0',
                  fontFamily: 'var(--font-primary)',
                }}
                onMouseDown={handleChatMouseDown}
                onTouchStart={handleChatTouchStart}
              >
                {/* Left side - Terminal Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 'normal',
                    textTransform: 'none',
                    letterSpacing: '0.5px',
                    textShadow: '0 0 10px var(--accent-cyan, rgba(255, 107, 107, 0.5))',
                  }}>
                    &gt;_ DAREDEVIL_ANALYSIS_TERMINAL
                  </span>
                </div>

                {/* Right side - Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDebugMode(!debugMode)}
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'transparent',
                      border: 'none',
                      color: errors.length > 0 ? 'var(--accent-red)' : 'var(--accent-cyan)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      opacity: 0.7,
                      transition: 'opacity 0.2s ease',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                    title={errors.length > 0 ? `${errors.length} errors detected` : 'Debug mode'}
                    aria-label={errors.length > 0 ? `${errors.length} errors detected. Click to view debug panel.` : 'Toggle debug mode'}
                    aria-pressed={debugMode}
                    tabIndex={0}
                  >
                    {errors.length > 0 ? '⚠️' : '🔧'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerClose()
                    }}
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      opacity: 0.7,
                      transition: 'opacity 0.2s ease',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                    aria-label="Close AI Chat Assistant"
                    tabIndex={0}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Debug Panel */}
              {debugMode && (
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--accent-red)',
                  fontFamily: 'var(--font-primary)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold' }}>DEBUG CONSOLE</span>
                    <button
                      onClick={clearErrors}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--accent-red)',
                        color: 'var(--accent-cyan)',
                        padding: '8px 12px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        borderRadius: '3px',
                        minHeight: '44px',
                        minWidth: '44px',
                      }}
                      aria-label="Clear all error messages"
                      tabIndex={0}
                    >
                      Clear
                    </button>
                  </div>
                  {errors.length === 0 ? (
                    <div style={{ color: 'var(--accent-green)' }}>✅ No errors detected</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {errors.slice(-5).map((error, index) => (
                        <div key={index} style={{
                          padding: '4px',
                          background: 'rgba(var(--accent-red, 220, 38, 38), 0.1)',
                          border: '1px solid rgba(var(--accent-red, 220, 38, 38), 0.3)',
                          borderRadius: '3px',
                          fontSize: '0.7rem'
                        }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>
                            [{error.code}] {error.message}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                            {error.timestamp.toLocaleTimeString()}
                          </div>
                          {error.details && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '2px' }}>
                              {JSON.stringify(error.details, null, 2)}
                            </div>
                          )}
                        </div>
                      ))}
                      {errors.length > 5 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textAlign: 'center' }}>
                          ... and {errors.length - 5} more errors
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Hellracer Banner Header */}
              <div style={{
                width: '100%',
                height: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: memoizedDimensions.isMobile ? '4px 0' : '8px 0',
                background: 'var(--bg-card)',
                borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
                flexShrink: 0,
                margin: 0,
                overflow: 'hidden',
              }}>
                <img 
                  src={hellracerBanner} 
                  alt="Hellracer Banner"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxWidth: '100%',
                    maxHeight: memoizedDimensions.isMobile ? '80px' : '120px',
                    objectFit: 'cover',
                    objectPosition: 'center',
                  }}
                />
              </div>

              {/* 3D Blob Background - Fixed Position */}
              <BlobBackground 
                width={memoizedDimensions.FORM_WIDTH} 
                height={memoizedDimensions.FORM_HEIGHT - 200}
                isVisible={isRecording}
                isVoiceDetected={isVoiceDetected}
              />

              {/* Messages Area */}
              <div 
                ref={messagesContainerRef}
                className="hide-scrollbar"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  paddingBottom: '16px',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  fontFamily: 'var(--font-primary)',
                  position: 'relative',
                  WebkitOverflowScrolling: 'touch',
                  marginBottom: '100px',
                  scrollBehavior: 'smooth',
                }}>
                
                {/* Grid pattern overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `
                    linear-gradient(90deg, rgba(var(--accent-cyan, 255, 107, 107), 0.08) 1px, transparent 1px),
                    linear-gradient(rgba(var(--accent-cyan, 255, 107, 107), 0.08) 1px, transparent 1px)
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
                          ? 'linear-gradient(135deg, #1e3a8a, #1e40af)' 
                          : 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        border: 'none',
                        fontFamily: 'var(--font-primary)',
                        lineHeight: '1.5',
                        boxShadow: message.isUser 
                          ? '0 0 10px rgba(30, 58, 138, 0.4)' 
                          : '0 0 10px rgba(127, 29, 29, 0.3)',
                        position: 'relative',
                        animation: 'messageSlideIn 0.3s ease-out',
                      }}>
                        {!message.isUser && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            fontSize: '0.75rem',
                          }}>
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                              &gt;_ DareDevil
                            </span>
                            <span style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem' }}>
                              NBA Analytics Expert
                            </span>
                          </div>
                        )}
                        <div style={{ marginBottom: '8px' }}>
                          {renderMessageContent(message.content)}
                        </div>
                        {!message.isUser && (
                          <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                          }}>
                            PREDICTION ENGINE v2.5
                          </div>
                        )}
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
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
                        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.875rem',
                        border: 'none',
                        fontFamily: 'var(--font-primary)',
                        lineHeight: '1.5',
                        boxShadow: '0 0 10px rgba(127, 29, 29, 0.3)',
                        position: 'relative',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                          fontSize: '0.75rem',
                        }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                            &gt;_ DareDevil
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                            NBA Analytics Expert
                          </span>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid var(--accent-cyan)',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginLeft: '8px'
                          }} />
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          🔄 Processing your request... Analyzing data and generating response.
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          marginBottom: '4px',
                        }}>
                          PREDICTION ENGINE v2.5 - ACTIVE
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
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

              {/* Floating Input Interface */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                fontFamily: 'var(--font-primary)',
                maxWidth: 'calc(100% - 40px)',
                minWidth: '300px',
              }}>
                <BorderRotate
                  animationMode="auto-rotate"
                  animationSpeed={8}
                  gradientColors={{
                    primary: 'var(--accent-red)',
                    secondary: 'var(--accent-red)',
                    accent: 'var(--accent-orange)'
                  }}
                  backgroundColor="var(--bg-card)"
                  borderWidth={3}
                  borderRadius={24}
                  style={{
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '12px',
                    minWidth: '300px',
                    maxWidth: '350px',
                    width: '100%',
                  }}>
                    {/* Text Input */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <textarea
                        ref={textareaRef}
                        placeholder="DareDevil is your daddy..."
                        disabled={isLoading}
                        style={{
                          width: '100%',
                          height: '52px',
                          resize: 'none',
                          outline: 'none',
                          background: 'var(--bg-secondary)',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          borderRadius: '12px',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-primary)',
                          fontSize: '0.875rem',
                          padding: '16px 16px',
                          lineHeight: '1.2',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                          overflow: 'hidden',
                        }}
                        onKeyDown={handleKeys}
                        onFocus={(e) => {
                          e.target.style.border = '1px solid var(--accent-red)';
                          e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(220, 38, 38, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.border = '1px solid rgba(220, 38, 38, 0.3)';
                          e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                        }}
                        aria-label="Type your message to DareDevil AI"
                        aria-describedby="chat-input-help"
                        tabIndex={0}
                      />
                      
                      {/* Input help text for screen readers */}
                      <div id="chat-input-help" style={{ display: 'none' }}>
                        Press Enter to send message. Press Ctrl+Enter for new line. Press Escape to close chat.
                        {isRecording && ' Voice recording is active. Release voice button to stop.'}
                      </div>
                      
                      {/* Voice recording indicator */}
                      {isRecording && (
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '-10px',
                          width: '18px',
                          height: '18px',
                          background: 'var(--accent-red)',
                          borderRadius: '50%',
                          animation: 'pulse 1s ease-in-out infinite',
                          border: '2px solid var(--bg-card)',
                          zIndex: 10
                        }} />
                      )}
                    </div>
                    
                    {/* Voice Button */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onMouseDown={handleVoiceMouseDown}
                      onMouseUp={handleVoiceMouseUp}
                      onTouchStart={handleVoiceTouchStart}
                      onTouchEnd={handleVoiceTouchEnd}
                      style={{
                        width: '52px',
                        height: '52px',
                        background: isRecording 
                          ? 'linear-gradient(135deg, var(--accent-red) 0%, var(--accent-red) 50%, #b91c1c 100%)' 
                          : 'linear-gradient(135deg, var(--accent-red) 0%, #b91c1c 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isRecording 
                          ? '0 0 20px rgba(220, 38, 38, 0.8), 0 4px 12px rgba(220, 38, 38, 0.4)' 
                          : '0 4px 12px rgba(220, 38, 38, 0.3)',
                        animation: isRecording ? 'recordingPulse 1.5s ease-in-out infinite' : 'none',
                        transform: 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading && !isRecording) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading && !isRecording) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                        }
                      }}
                      title={isRecording ? "Release to stop recording" : "Hold to record voice message"}
                      aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
                      aria-pressed={isRecording}
                      tabIndex={0}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                      }}>
                        {isRecording ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                            <rect x="6" y="6" width="12" height="12" rx="3"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* Send Button */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleTextSend}
                      style={{
                        width: '52px',
                        height: '52px',
                        background: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: '12px',
                        color: 'var(--accent-red)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                        transform: 'translateY(0)',
                        backdropFilter: 'blur(10px)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.2)';
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.3)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.8), inset 0 2px 4px rgba(220, 38, 38, 0.3)';
                          e.currentTarget.style.transform = 'translateY(0) scale(0.95)';
                        }
                      }}
                      onMouseUp={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
                        }
                      }}
                      title="Send text message"
                      aria-label="Send text message"
                      tabIndex={0}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                      </div>
                    </button>
                  </div>
                </BorderRotate>
              </div>
            </div>
          )}
      </motion.div>
      </div>

      {/* Expert Advice Modal */}
      {bettingContext && (
        <ExpertAdviceModal
          isOpen={showExpertAdvice}
          onClose={() => setShowExpertAdvice(false)}
          context={{
            betAmount: bettingIntent.amount || 0,
            betType: 'single',
            sport: bettingIntent.sport || 'unknown',
            userHistory: {
              totalBets: 0, // Would be fetched from user's betting history
              winRate: 0,
              avgBetSize: 0
            }
          }}
        />
      )}
    </>
  )
}

export default AIChatAssistant
