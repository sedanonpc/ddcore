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
import QRCodeDisplay from "./QRCodeDisplay"

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
  qrCodeUrl?: string // Optional QR code URL for bet sharing
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

// Optimized state management with useReducer
interface ChatState {
  ui: {
    showForm: boolean
    isDragging: boolean
    isDragReady: boolean
    position: Position
    windowSize: { width: number; height: number }
    debugMode: boolean
  }
  chat: {
    messages: ChatMessage[]
    isLoading: boolean
    sessionId: string
    errors: ChatError[]
  }
  recording: {
    isRecording: boolean
    isVoiceDetected: boolean
  }
  connection: {
    status: 'connecting' | 'connected' | 'disconnected'
    backendConnected: boolean
  }
  betting: {
    predictionMode: boolean
    bettingIntent: Partial<BettingIntent>
    questionFlow: QuestionFlow | null
    showExpertAdvice: boolean
    bettingContext: any
  }
}

type ChatAction = 
  | { type: 'SET_SHOW_FORM'; payload: boolean }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_DRAG_READY'; payload: boolean }
  | { type: 'SET_POSITION'; payload: Position }
  | { type: 'SET_WINDOW_SIZE'; payload: { width: number; height: number } }
  | { type: 'SET_DEBUG_MODE'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: ChatError }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_VOICE_DETECTED'; payload: boolean }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connecting' | 'connected' | 'disconnected' }
  | { type: 'SET_BACKEND_CONNECTED'; payload: boolean }
  | { type: 'SET_PREDICTION_MODE'; payload: boolean }
  | { type: 'SET_BETTING_INTENT'; payload: Partial<BettingIntent> }
  | { type: 'SET_QUESTION_FLOW'; payload: QuestionFlow | null }
  | { type: 'SET_SHOW_EXPERT_ADVICE'; payload: boolean }
  | { type: 'SET_BETTING_CONTEXT'; payload: any }

const initialState: ChatState = {
  ui: {
    showForm: false,
    isDragging: false,
    isDragReady: false,
    position: { x: 0, y: 0 },
    windowSize: { width: window.innerWidth, height: window.innerHeight },
    debugMode: false
  },
  chat: {
    messages: [],
    isLoading: false,
    sessionId: `session_${Date.now()}_${Math.random()}`,
    errors: []
  },
  recording: {
    isRecording: false,
    isVoiceDetected: false
  },
  connection: {
    status: 'disconnected',
    backendConnected: false
  },
  betting: {
    predictionMode: false,
    bettingIntent: {},
    questionFlow: null,
    showExpertAdvice: false,
    bettingContext: null
  }
}

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_SHOW_FORM':
      return { ...state, ui: { ...state.ui, showForm: action.payload } }
    case 'SET_DRAGGING':
      return { ...state, ui: { ...state.ui, isDragging: action.payload } }
    case 'SET_DRAG_READY':
      return { ...state, ui: { ...state.ui, isDragReady: action.payload } }
    case 'SET_POSITION':
      return { ...state, ui: { ...state.ui, position: action.payload } }
    case 'SET_WINDOW_SIZE':
      return { ...state, ui: { ...state.ui, windowSize: action.payload } }
    case 'SET_DEBUG_MODE':
      return { ...state, ui: { ...state.ui, debugMode: action.payload } }
    case 'ADD_MESSAGE':
      return { ...state, chat: { ...state.chat, messages: [...state.chat.messages, action.payload] } }
    case 'SET_LOADING':
      return { ...state, chat: { ...state.chat, isLoading: action.payload } }
    case 'ADD_ERROR':
      return { 
        ...state, 
        chat: { 
          ...state.chat, 
          errors: [...state.chat.errors, action.payload].slice(-10) // Keep only last 10 errors
        } 
      }
    case 'CLEAR_ERRORS':
      return { ...state, chat: { ...state.chat, errors: [] } }
    case 'SET_RECORDING':
      return { ...state, recording: { ...state.recording, isRecording: action.payload } }
    case 'SET_VOICE_DETECTED':
      return { ...state, recording: { ...state.recording, isVoiceDetected: action.payload } }
    case 'SET_CONNECTION_STATUS':
      return { ...state, connection: { ...state.connection, status: action.payload } }
    case 'SET_BACKEND_CONNECTED':
      return { ...state, connection: { ...state.connection, backendConnected: action.payload } }
    case 'SET_PREDICTION_MODE':
      return { ...state, betting: { ...state.betting, predictionMode: action.payload } }
    case 'SET_BETTING_INTENT':
      return { ...state, betting: { ...state.betting, bettingIntent: action.payload } }
    case 'SET_QUESTION_FLOW':
      return { ...state, betting: { ...state.betting, questionFlow: action.payload } }
    case 'SET_SHOW_EXPERT_ADVICE':
      return { ...state, betting: { ...state.betting, showExpertAdvice: action.payload } }
    case 'SET_BETTING_CONTEXT':
      return { ...state, betting: { ...state.betting, bettingContext: action.payload } }
    default:
      return state
  }
}

/**
 * AI Chat Assistant Component
 * Lean message relay to Telegram-compatible LLM backend
 */
const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ className = '' }) => {
  // Optimized state management with useReducer
  const [state, dispatch] = React.useReducer(chatReducer, {
    ...initialState,
    ui: {
      ...initialState.ui,
      position: (() => {
        // Default position: lower right of screen
        const isMobileInit = window.innerWidth < 768
        return {
          x: window.innerWidth - (isMobileInit ? 80 : 100),
          y: window.innerHeight - (isMobileInit ? 80 : 100)
        }
      })()
    }
  })

  // Refs for performance optimization
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
  const voiceRecordingTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const voiceDetectionTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Virtualization refs
  const virtualScrollRef = React.useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 0 })
  const [containerHeight, setContainerHeight] = React.useState(0)
  const itemHeights = React.useRef<Map<number, number>>(new Map())

  // Virtualization configuration
  const VIRTUAL_CONFIG = React.useMemo(() => ({
    itemHeight: 80, // Estimated height per message
    overscan: 5, // Number of items to render outside visible area
    threshold: 50 // Only virtualize if more than 50 messages
  }), [])

  // Memoized dimensions calculation
  const memoizedDimensions = React.useMemo(() => {
    const isMobile = state.ui.windowSize.width < 768
    return {
      BUTTON_SIZE: isMobile ? 60 : 80,
      FORM_WIDTH: isMobile ? 320 : 400,
      FORM_HEIGHT: isMobile ? 500 : 600,
      isMobile
    }
  }, [state.ui.windowSize.width])

  // Memoized message count for virtualization decisions
  const shouldVirtualize = React.useMemo(() => {
    return state.chat.messages.length > VIRTUAL_CONFIG.threshold
  }, [state.chat.messages.length, VIRTUAL_CONFIG.threshold])

  // Memoized connection status for UI updates
  const connectionStatusDisplay = React.useMemo(() => {
    return {
      isConnected: state.connection.status === 'connected',
      isConnecting: state.connection.status === 'connecting',
      isDisconnected: state.connection.status === 'disconnected',
      statusColor: state.connection.status === 'connected' ? '#10b981' : 
                   state.connection.status === 'connecting' ? '#f59e0b' : '#ef4444'
    }
  }, [state.connection.status])

  // Memoized betting mode display
  const bettingModeDisplay = React.useMemo(() => {
    return {
      isActive: state.betting.predictionMode,
      titleColor: state.betting.predictionMode ? '#ffffff' : 'var(--accent-cyan)',
      titleShadow: state.betting.predictionMode 
        ? '0 0 10px rgba(255, 255, 255, 0.6)' 
        : '0 0 10px var(--accent-cyan, rgba(255, 107, 107, 0.5))',
      engineType: state.betting.predictionMode ? 'Prediction Engine' : 'NBA Analytics Expert'
    }
  }, [state.betting.predictionMode])

  // Memoized message processing for performance
  const processedMessages = React.useMemo(() => {
    return state.chat.messages.map(message => ({
      ...message,
      formattedTime: message.timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      isRecent: Date.now() - message.timestamp.getTime() < 30000, // Last 30 seconds
      hasQRCode: !!message.qrCodeUrl
    }))
  }, [state.chat.messages])

  // Memoized error summary for debug panel
  const errorSummary = React.useMemo(() => {
    const errors = state.chat.errors
    return {
      total: errors.length,
      recent: errors.filter(error => Date.now() - error.timestamp.getTime() < 60000).length, // Last minute
      critical: errors.filter(error => error.code.includes('BACKEND') || error.code.includes('NETWORK')).length,
      byType: errors.reduce((acc, error) => {
        const type = error.code.split('_')[0]
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }, [state.chat.errors])

  // Memoized position calculations for drag operations
  const positionCalculations = React.useMemo(() => {
    const { x, y } = state.ui.position
    const { BUTTON_SIZE, FORM_WIDTH, FORM_HEIGHT } = memoizedDimensions
    const { width, height } = state.ui.windowSize
    
    return {
      isOffScreen: x < 0 || y < 0 || x + FORM_WIDTH > width || y + FORM_HEIGHT > height,
      safePosition: {
        x: Math.max(0, Math.min(x, width - FORM_WIDTH)),
        y: Math.max(0, Math.min(y, height - FORM_HEIGHT))
      },
      buttonBounds: {
        left: x,
        top: y,
        right: x + BUTTON_SIZE,
        bottom: y + BUTTON_SIZE
      }
    }
  }, [state.ui.position, state.ui.windowSize, memoizedDimensions])

  // Calculate visible range for virtualization
  const calculateVisibleRange = React.useCallback((scrollTop: number, containerHeight: number) => {
    const { itemHeight, overscan } = VIRTUAL_CONFIG
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(
      state.chat.messages.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { start, end }
  }, [state.chat.messages.length, VIRTUAL_CONFIG])

  // Update visible range when scrolling
  const handleScroll = React.useCallback(() => {
    if (!virtualScrollRef.current) return
    
    const scrollTop = virtualScrollRef.current.scrollTop
    const newRange = calculateVisibleRange(scrollTop, containerHeight)
    setVisibleRange(newRange)
  }, [calculateVisibleRange, containerHeight])

  // Initialize visible range
  React.useEffect(() => {
    if (state.chat.messages.length > 0) {
      const newRange = calculateVisibleRange(0, containerHeight)
      setVisibleRange(newRange)
    }
  }, [state.chat.messages.length, calculateVisibleRange, containerHeight])

  // Update container height when it changes
  React.useEffect(() => {
    const updateHeight = () => {
      if (virtualScrollRef.current) {
        const height = virtualScrollRef.current.clientHeight
        setContainerHeight(height)
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Virtualized message component
  const VirtualizedMessage = React.memo(({ message, index }: { message: ChatMessage; index: number }) => (
    <div
      key={message.id}
      style={{
        display: 'flex',
        justifyContent: message.isUser ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
      }}
    >
      <div 
        className="message-slide-in"
        style={{
          maxWidth: '85%',
          padding: '16px 20px',
          borderRadius: '16px',
          background: message.isUser 
            ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(30, 64, 175, 0.9))' 
            : 'linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(25, 25, 25, 0.9))',
          color: message.isUser ? '#ffffff' : '#f0f0f0',
          fontSize: '0.9rem',
          border: message.isUser 
            ? '1px solid rgba(59, 130, 246, 0.3)' 
            : '1px solid rgba(220, 38, 38, 0.4)',
          fontFamily: 'var(--font-primary)',
          lineHeight: '1.6',
          boxShadow: message.isUser 
            ? '0 8px 32px rgba(30, 58, 138, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
            : '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          position: 'relative',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          overflow: 'hidden',
        }}>
        {!message.isUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
            fontSize: '0.8rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(220, 38, 38, 0.1)',
              padding: '4px 8px',
              borderRadius: '8px',
              border: '1px solid rgba(220, 38, 38, 0.3)',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                background: 'var(--accent-red)',
                borderRadius: '50%',
                animation: 'pulse 1s ease-in-out infinite',
              }} />
              <span style={{ 
                color: 'var(--accent-red)', 
                fontWeight: 'bold',
                textShadow: '0 0 8px rgba(220, 38, 38, 0.5)',
              }}>
                &gt;_ DareDevil
              </span>
            </div>
            <span style={{ 
              color: 'var(--accent-cyan)', 
              fontSize: '0.75rem',
              opacity: 0.9,
              textShadow: '0 0 4px rgba(6, 182, 212, 0.3)',
            }}>
              {bettingModeDisplay.engineType}
            </span>
          </div>
        )}
        
        <div style={{ 
          marginBottom: '8px',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }}>
          {message.content}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.7rem',
          color: 'rgba(240, 240, 240, 0.6)',
          marginTop: '8px',
        }}>
          <span style={{ 
            fontFamily: 'Consolas, "Courier New", monospace',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
          }}>
            {message.timestamp.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
          </span>
          {message.type === 'voice' && (
            <span style={{ 
              color: 'var(--accent-cyan)',
              textShadow: '0 0 4px rgba(6, 182, 212, 0.3)',
            }}>
              🎤 Voice
            </span>
          )}
        </div>
      </div>
    </div>
  ))

  // Simple betting handler (bypasses MCP complexity)
  const { handleSimpleBetRequest } = useSimpleBettingHandler({ 
    setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      console.log('🔍 setMessages called with:', typeof messages, messages)
      if (Array.isArray(messages)) {
        // If it's an array, add each message
        console.log('📝 Adding array of messages:', messages.length)
        messages.forEach(message => {
          console.log('📝 Adding message:', message.id, message.content.substring(0, 50) + '...')
          dispatch({ type: 'ADD_MESSAGE', payload: message })
        })
      } else {
        // If it's a function, execute it with current messages and add the result
        console.log('📝 Executing function-based setMessages')
        const newMessages = messages(state.chat.messages)
        console.log('📝 Function result:', newMessages.length, 'messages')
        if (Array.isArray(newMessages)) {
          // Find the new messages by comparing with current messages
          const currentIds = new Set(state.chat.messages.map(m => m.id))
          const newMessagesToAdd = newMessages.filter(m => !currentIds.has(m.id))
          console.log('📝 New messages to add:', newMessagesToAdd.length)
          newMessagesToAdd.forEach(message => {
            console.log('📝 Adding new message:', message.id, message.content.substring(0, 50) + '...')
            dispatch({ type: 'ADD_MESSAGE', payload: message })
          })
        }
      }
    },
    setIsLoading: (loading: boolean | ((prev: boolean) => boolean)) => {
      if (typeof loading === 'boolean') {
        dispatch({ type: 'SET_LOADING', payload: loading })
      } else {
        // Handle function case
        dispatch({ type: 'SET_LOADING', payload: loading(state.chat.isLoading) })
      }
    }
  })

  // Function to convert URLs in text to clickable links with copy functionality
  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)
    
    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        // You could add a toast notification here
        console.log('Copied to clipboard:', text)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        const isShortened = part.includes('...')
        const displayText = isShortened ? part : part.length > 50 ? `${part.slice(0, 50)}...` : part
        
        return (
          <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <a
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-cyan)',
                textDecoration: 'underline',
                cursor: 'pointer',
                wordBreak: 'break-all',
                fontFamily: 'Consolas, "Courier New", monospace'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {displayText}
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(part)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '2px',
                borderRadius: '2px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="Copy link"
            >
              📋
            </button>
          </span>
        )
      }
      return part
    })
  }

  // Calculate responsive dimensions with accessibility considerations
  const isMobile = state.ui.windowSize.width < 768
  const FORM_WIDTH = isMobile ? 320 : 400
  const FORM_HEIGHT = isMobile ? 500 : 600
  const BUTTON_SIZE = isMobile ? 56 : 60 // Minimum 44px touch target



  // Optimized error handling utilities
  const clearErrors = React.useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' })
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

  // Connection pool and retry configuration
  const connectionConfig = React.useMemo(() => ({
    baseUrl: 'http://127.0.0.1:8001',
    healthEndpoint: '/health',
    chatEndpoint: '/chat',
    maxRetries: 2, // Reduced retries to fail faster
    retryDelay: 2000, // Increased base delay
    maxRetryDelay: 8000, // Reduced max delay
    healthCheckTimeout: 5000, // Increased health check timeout
    chatTimeout: 15000, // Increased chat timeout
    backoffMultiplier: 1.5, // Reduced backoff multiplier
    maxConcurrentRequests: 3, // Reduced concurrent requests
    requestQueueSize: 5 // Reduced queue size
  }), [])

  // Error rate limiting configuration
  const errorRateConfig = React.useMemo(() => ({
    maxErrorsPerMinute: 5,
    maxErrorsPerHour: 20,
    errorCooldownMs: 30000, // 30 seconds
    maxConsecutiveErrors: 3,
    errorTypes: {
      NETWORK: 'network',
      TIMEOUT: 'timeout',
      SERVER: 'server',
      VALIDATION: 'validation',
      UNKNOWN: 'unknown'
    }
  }), [])

  // Connection pool state
  const connectionPoolRef = React.useRef({
    activeRequests: 0,
    requestQueue: [] as Array<() => Promise<any>>,
    isProcessingQueue: false
  })

  // Error rate limiting state
  const errorRateRef = React.useRef({
    errorHistory: [] as Array<{ timestamp: number; type: string }>,
    consecutiveErrors: 0,
    lastErrorTime: 0,
    isInCooldown: false,
    cooldownTimer: null as NodeJS.Timeout | null
  })

  // Connection pool manager
  const connectionPool = React.useMemo(() => ({
    async execute<T>(request: () => Promise<T>): Promise<T> {
      const pool = connectionPoolRef.current
      
      // If we're under the limit, execute immediately
      if (pool.activeRequests < connectionConfig.maxConcurrentRequests) {
        pool.activeRequests++
        try {
          const result = await request()
          return result
        } finally {
          pool.activeRequests--
          this.processQueue()
        }
      }
      
      // Otherwise, queue the request
      return new Promise((resolve, reject) => {
        pool.requestQueue.push(async () => {
          try {
            const result = await request()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })
        
        this.processQueue()
      })
    },
    
    processQueue() {
      const pool = connectionPoolRef.current
      
      if (pool.isProcessingQueue || pool.requestQueue.length === 0) {
        return
      }
      
      pool.isProcessingQueue = true
      
      const processNext = async () => {
        if (pool.requestQueue.length === 0 || pool.activeRequests >= connectionConfig.maxConcurrentRequests) {
          pool.isProcessingQueue = false
          return
        }
        
        const request = pool.requestQueue.shift()
        if (request) {
          pool.activeRequests++
          try {
            await request()
          } finally {
            pool.activeRequests--
            processNext()
          }
        }
      }
      
      processNext()
    }
  }), [connectionConfig])

  // Connection retry logic with exponential backoff
  const retryWithBackoff = React.useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = connectionConfig.maxRetries,
    baseDelay: number = connectionConfig.retryDelay
  ): Promise<any> => {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(connectionConfig.backoffMultiplier, attempt),
          connectionConfig.maxRetryDelay
        )
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay
        const totalDelay = delay + jitter
        
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${totalDelay}ms delay`)
        await new Promise(resolve => setTimeout(resolve, totalDelay))
      }
    }
    
    throw lastError
  }, [connectionConfig])

  // Error rate limiting functions
  const shouldAllowError = React.useCallback((errorType: string): boolean => {
    const now = Date.now()
    const errorRate = errorRateRef.current
    
    // Clean old errors (older than 1 hour)
    errorRate.errorHistory = errorRate.errorHistory.filter(
      error => now - error.timestamp < 3600000 // 1 hour
    )
    
    // Check if we're in cooldown
    if (errorRate.isInCooldown) {
      return false
    }
    
    // Count recent errors
    const recentErrors = errorRate.errorHistory.filter(
      error => now - error.timestamp < 60000 // 1 minute
    )
    
    const hourlyErrors = errorRate.errorHistory.length
    
    // Check rate limits
    if (recentErrors.length >= errorRateConfig.maxErrorsPerMinute) {
      console.warn('Error rate limit exceeded per minute')
      return false
    }
    
    if (hourlyErrors >= errorRateConfig.maxErrorsPerHour) {
      console.warn('Error rate limit exceeded per hour')
      return false
    }
    
    if (errorRate.consecutiveErrors >= errorRateConfig.maxConsecutiveErrors) {
      console.warn('Consecutive error limit exceeded')
      return false
    }
    
    return true
  }, [errorRateConfig])

  const recordError = React.useCallback((errorType: string): void => {
    const now = Date.now()
    const errorRate = errorRateRef.current
    
    // Record the error
    errorRate.errorHistory.push({ timestamp: now, type: errorType })
    errorRate.lastErrorTime = now
    
    // Update consecutive error count
    if (now - errorRate.lastErrorTime < 5000) { // 5 seconds
      errorRate.consecutiveErrors++
    } else {
      errorRate.consecutiveErrors = 1
    }
    
    // Check if we should enter cooldown
    if (errorRate.consecutiveErrors >= errorRateConfig.maxConsecutiveErrors) {
      errorRate.isInCooldown = true
      
      // Clear existing cooldown timer
      if (errorRate.cooldownTimer) {
        clearTimeout(errorRate.cooldownTimer)
      }
      
      // Set cooldown timer
      errorRate.cooldownTimer = setTimeout(() => {
        errorRate.isInCooldown = false
        errorRate.consecutiveErrors = 0
        errorRate.cooldownTimer = null
        console.log('Error cooldown period ended')
      }, errorRateConfig.errorCooldownMs)
      
      console.warn(`Entering error cooldown for ${errorRateConfig.errorCooldownMs}ms`)
    }
  }, [errorRateConfig])

  const getErrorType = React.useCallback((error: Error): string => {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return errorRateConfig.errorTypes.NETWORK
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return errorRateConfig.errorTypes.TIMEOUT
    }
    if (message.includes('server') || message.includes('500') || message.includes('502') || message.includes('503')) {
      return errorRateConfig.errorTypes.SERVER
    }
    if (message.includes('validation') || message.includes('400') || message.includes('422')) {
      return errorRateConfig.errorTypes.VALIDATION
    }
    
    return errorRateConfig.errorTypes.UNKNOWN
  }, [errorRateConfig])

  // Optimized error handling with rate limiting
  const addError = React.useCallback((code: ChatErrorCode, message: string, details?: any) => {
    const error: ChatError = {
      code,
      message,
      details,
      timestamp: new Date()
    }
    
    // Create error object for rate limiting
    const errorObj = new Error(message)
    const errorType = getErrorType(errorObj)
    
    // Check if we should allow this error
    if (!shouldAllowError(errorType)) {
      console.warn('Error rate limited, not adding to UI:', message)
      return
    }
    
    // Record the error for rate limiting
    recordError(errorType)
    
    // Add to UI
    dispatch({ type: 'ADD_ERROR', payload: error })
    console.error(`[${code}] ${message}`, details)
  }, [shouldAllowError, recordError, getErrorType])

  // Optimized backend connection check with retry logic and connection pooling
  const checkBackendConnection = React.useCallback(async () => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' })
    
    try {
      await connectionPool.execute(async () => {
        return await retryWithBackoff(async () => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), connectionConfig.healthCheckTimeout)
          
          try {
            const response = await fetch(`${connectionConfig.baseUrl}${connectionConfig.healthEndpoint}`, {
              method: 'GET',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
              }
            })
            
            clearTimeout(timeoutId)
            
            if (!response.ok) {
              throw new Error(`Health check failed with status: ${response.status}`)
            }
            
            return response
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        })
      })
      
      dispatch({ type: 'SET_BACKEND_CONNECTED', payload: true })
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
    } catch (error) {
      console.warn('Backend connection failed after retries:', error)
      dispatch({ type: 'SET_BACKEND_CONNECTED', payload: false })
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' })
    }
  }, [retryWithBackoff, connectionConfig, connectionPool])

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
      dispatch({ type: 'SET_BETTING_INTENT', payload: intent })

      const context = {
        userId: user.walletAddress,
        intent,
        matches: [],
        availableCompetitors: {},
        riskAssessment: { level: 'low' as const, factors: [], recommendation: '', confidence: 0 }
      }

      dispatch({ type: 'SET_BETTING_CONTEXT', payload: context })

      // Generate guiding questions
      const questionFlow = await mcpService.generateNextQuestion(context)
      dispatch({ type: 'SET_QUESTION_FLOW', payload: questionFlow })

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
        dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })
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
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
      
      // Don't let it fall through to LLM
      return
    }
  }, [addError])

  const answerGuidingQuestion = React.useCallback(async (questionId: string, answer: string): Promise<void> => {
    if (!state.betting.questionFlow || !state.betting.bettingContext) return

    try {
      // Use MCP service to process the answer
      const result = await mcpService.processQuestionAnswer(state.betting.bettingContext, questionId, answer)
      
      // Update local state with the updated context
      dispatch({ type: 'SET_BETTING_CONTEXT', payload: result.updatedContext })
      dispatch({ type: 'SET_BETTING_INTENT', payload: result.updatedContext.intent })

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
        dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })
        
        // Update question flow state
        dispatch({ type: 'SET_QUESTION_FLOW', payload: {
          questions: [result.nextQuestion],
          context: result.updatedContext,
          completionPercentage: mcpService['calculateCompletionPercentage'](result.updatedContext.intent),
          canProceed: result.canProceed,
          currentQuestionIndex: 0
        }})
      }

    } catch (error) {
      console.error('Failed to process question answer:', error)
      addError(ChatErrorCode.BACKEND_INVALID_RESPONSE, 'Failed to process your answer')
    }
  }, [state.betting.bettingContext, state.betting.questionFlow, addError])

  const executeAutonomousBet = React.useCallback(async (intent: BettingIntent): Promise<void> => {
    if (!state.betting.bettingContext) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Generate expert advice first
      const expertAdvice = await mcpService.generateExpertAdvice(state.betting.bettingContext)

      // Show expert advice modal if risk is high
      if (expertAdvice.riskLevel === 'high' || expertAdvice.riskLevel === 'extreme') {
        dispatch({ type: 'SET_SHOW_EXPERT_ADVICE', payload: true })
        return
      }

      // Create autonomous match if needed
      let match = state.betting.bettingContext.matches[0]
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
        dispatch({ type: 'ADD_MESSAGE', payload: successMessage })

        // Transaction details with Core Explorer link
        if (mcpResponse.data?.transactionHash) {
          const txMessage: ChatMessage = {
            id: `ai_tx_${Date.now()}`,
            content: `🔗 **TRANSACTION CONFIRMED ON-CHAIN**\n\n📋 **Transaction ID:** ${mcpResponse.data.transactionHash}\n\n🔍 **View on Core Explorer:** https://scan.test2.btcs.network/tx/${mcpResponse.data.transactionHash}\n\n✨ Your bet is now permanently recorded on the blockchain!`,
            type: 'text',
            timestamp: new Date(),
            isUser: false
          }
          dispatch({ type: 'ADD_MESSAGE', payload: txMessage })
        }

        // Bet acceptance page and sharing info
        if (mcpResponse.data?.shareableUrl) {
          const shareMessage: ChatMessage = {
            id: `ai_share_${Date.now()}`,
            content: `🎯 **BET ACCEPTANCE PAGE**\n\n📱 **Share this link with friends to accept your bet:**\n${mcpResponse.data.shareableUrl}\n\n😈 **QR Code:** Available for easy sharing\n\n🎲 Once someone accepts, the bet will be locked and ready for resolution!`,
            type: 'text',
            timestamp: new Date(),
            isUser: false
          }
          dispatch({ type: 'ADD_MESSAGE', payload: shareMessage })
        }

        // Instructions for next steps
        const instructionsMessage: ChatMessage = {
          id: `ai_instructions_${Date.now()}`,
          content: `🎮 **WHAT HAPPENS NEXT?**\n\n1️⃣ Share the bet link with friends\n2️⃣ Wait for someone to accept the challenge\n3️⃣ Watch the match/game\n4️⃣ Bet resolves automatically based on results\n\n💰 Winner takes the full pot! Good luck! 🍀`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        dispatch({ type: 'ADD_MESSAGE', payload: instructionsMessage })

        // Reset betting state
        dispatch({ type: 'SET_BETTING_INTENT', payload: {} })
        dispatch({ type: 'SET_QUESTION_FLOW', payload: null })
        dispatch({ type: 'SET_BETTING_CONTEXT', payload: null })

      } else {
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          content: mcpResponse.message || 'Failed to create bet',
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
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
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.betting.bettingContext])

  // Load saved position from localStorage
  React.useEffect(() => {
    const savedPosition = localStorage.getItem('ai-chat-position')
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition)
        dispatch({ type: 'SET_POSITION', payload: parsed })
      } catch (e) {
        console.warn('Failed to parse saved AI chat position')
      }
    }
  }, [])

  // Optimized backend connection monitoring with stable dependencies
  React.useEffect(() => {
    // Initial check
    checkBackendConnection()
    
    // Set up periodic checks every 10 seconds
    const interval = setInterval(checkBackendConnection, 10000)
    
    return () => clearInterval(interval)
  }, []) // Empty dependency array - checkBackendConnection is stable

  // Save position to localStorage
  const savePosition = React.useCallback((newPosition: Position) => {
    localStorage.setItem('ai-chat-position', JSON.stringify(newPosition))
  }, [])

  const triggerClose = React.useCallback(() => {
    dispatch({ type: 'SET_SHOW_FORM', payload: false })
    textareaRef.current?.blur()
    
    // Stop any active recording when closing
    if (state.recording.isRecording && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
        dispatch({ type: 'SET_RECORDING', payload: false })
      } catch (error) {
        console.warn('Error stopping recording on close:', error)
        dispatch({ type: 'SET_RECORDING', payload: false })
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
    dispatch({ type: 'SET_POSITION', payload: { x: defaultX, y: defaultY } })
  }, [state.recording.isRecording])

  // Optimized auto-scroll with stable reference
  const scrollToBottom = React.useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, []) // Empty dependency array - function is stable

  // Auto-scroll when messages change
  React.useEffect(() => {
    scrollToBottom()
  }, [state.chat.messages.length]) // Only depend on message count, not the entire messages array

  // Optimized voice detection simulation with proper cleanup
  React.useEffect(() => {
    let detectionTimeout: NodeJS.Timeout | null = null
    
    if (state.recording.isRecording) {
      // Simulate voice detection with random intervals
      const simulateVoiceDetection = () => {
        if (state.recording.isRecording) {
        if (Math.random() > 0.3) { // 70% chance of voice detection
            dispatch({ type: 'SET_VOICE_DETECTED', payload: true })
          
          // Clear previous timer
          if (voiceDetectionTimerRef.current) {
            clearTimeout(voiceDetectionTimerRef.current)
          }
          
          // Reset voice detection after random duration
          voiceDetectionTimerRef.current = setTimeout(() => {
              dispatch({ type: 'SET_VOICE_DETECTED', payload: false })
          }, Math.random() * 2000 + 500) // 0.5-2.5 seconds
        }
        
        // Schedule next detection
          detectionTimeout = setTimeout(simulateVoiceDetection, Math.random() * 1000 + 200) // 0.2-1.2 seconds
        }
      }
      
      simulateVoiceDetection()
    } else {
      // Stop voice detection when not recording
      dispatch({ type: 'SET_VOICE_DETECTED', payload: false })
      if (voiceDetectionTimerRef.current) {
        clearTimeout(voiceDetectionTimerRef.current)
        voiceDetectionTimerRef.current = null
      }
    }
    
    return () => {
      if (voiceDetectionTimerRef.current) {
        clearTimeout(voiceDetectionTimerRef.current)
        voiceDetectionTimerRef.current = null
      }
      if (detectionTimeout) {
        clearTimeout(detectionTimeout)
    }
    }
  }, [state.recording.isRecording])

  // Optimized click handler for button - open chat
  const handleButtonClick = React.useCallback(() => {
    // Only open chat if we haven't been dragging
    if (!state.ui.showForm && !wasDraggingRef.current) {
      // Center the chat window when opening
      const centerX = (window.innerWidth - memoizedDimensions.FORM_WIDTH) / 2
      const centerY = (window.innerHeight - memoizedDimensions.FORM_HEIGHT) / 2
      dispatch({ type: 'SET_POSITION', payload: { x: centerX, y: centerY } })
      
      dispatch({ type: 'SET_SHOW_FORM', payload: true })
      
      // Check backend connection when opening chat
      checkBackendConnection()
      
      setTimeout(() => {
        textareaRef.current?.focus()
      })
    }
    // Reset the wasDragging flag after click
    wasDraggingRef.current = false
  }, [state.ui.showForm, memoizedDimensions.FORM_WIDTH, memoizedDimensions.FORM_HEIGHT, checkBackendConnection])

  // Optimized mouse down handler for button - start drag timer
  const handleButtonMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.button === 0) { // Left mouse button only
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      initialPositionRef.current = { ...state.ui.position }
      
      // Start drag ready animation
      dispatch({ type: 'SET_DRAG_READY', payload: true })
      
      longPressTimerRef.current = setTimeout(() => {
        dispatch({ type: 'SET_DRAGGING', payload: true })
        isDraggingRef.current = true
      }, 500) // 500ms for long press
    }
  }, [state.ui.position])

  // Optimized mouse down handler for chat window header
  const handleChatMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initialPositionRef.current = { ...state.ui.position }
    dispatch({ type: 'SET_DRAGGING', payload: true })
    isDraggingRef.current = true
  }, [state.ui.position])

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
      
      dispatch({ type: 'SET_POSITION', payload: newPosition })
    }
  }, [memoizedDimensions.BUTTON_SIZE])

  const handleMouseUp = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // Reset drag ready state
    dispatch({ type: 'SET_DRAG_READY', payload: false })
    
    if (isDraggingRef.current) {
      // We were dragging - just stop dragging
      dispatch({ type: 'SET_DRAGGING', payload: false })
      isDraggingRef.current = false
      wasDraggingRef.current = true // Mark that we were dragging
      savePosition(state.ui.position)
    }
  }, [state.ui.position, savePosition])

  // Touch handlers for button only
  const handleButtonTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    dragStartRef.current = { x: touch.clientX, y: touch.clientY }
    initialPositionRef.current = { ...state.ui.position }
    
    // Start drag ready animation
    dispatch({ type: 'SET_DRAG_READY', payload: true })
    
    // Start drag after 0.5 second delay
    longPressTimerRef.current = setTimeout(() => {
      dispatch({ type: 'SET_DRAGGING', payload: true })
      isDraggingRef.current = true
    }, 500)
  }, [state.ui.position])

  // Touch click handler for button
  const handleButtonTouchEnd = React.useCallback(() => {
    // Clear the drag ready timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // Reset drag states
    dispatch({ type: 'SET_DRAG_READY', payload: false })
    dispatch({ type: 'SET_DRAGGING', payload: false })
    isDraggingRef.current = false
    
    // Only open chat if we haven't been dragging
    if (!state.ui.showForm && !wasDraggingRef.current) {
      // Center the chat window when opening
      const centerX = (window.innerWidth - memoizedDimensions.FORM_WIDTH) / 2
      const centerY = (window.innerHeight - memoizedDimensions.FORM_HEIGHT) / 2
      dispatch({ type: 'SET_POSITION', payload: { x: centerX, y: centerY } })
      
      dispatch({ type: 'SET_SHOW_FORM', payload: true })
      setTimeout(() => {
        textareaRef.current?.focus()
      })
    }
    
    // Reset the wasDragging flag after touch end
    wasDraggingRef.current = false
  }, [state.ui.showForm, memoizedDimensions.FORM_WIDTH, memoizedDimensions.FORM_HEIGHT])

  // Touch handlers for chat window header
  const handleChatTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    dragStartRef.current = { x: touch.clientX, y: touch.clientY }
    initialPositionRef.current = { ...state.ui.position }
    dispatch({ type: 'SET_DRAGGING', payload: true })
    isDraggingRef.current = true
  }, [state.ui.position])

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
      
      dispatch({ type: 'SET_POSITION', payload: newPosition })
    }
  }, [memoizedDimensions.BUTTON_SIZE])

  const handleTouchEnd = React.useCallback((e?: TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // Reset drag ready state
    dispatch({ type: 'SET_DRAG_READY', payload: false })
    
    if (isDraggingRef.current) {
      // We were dragging - just stop dragging
      dispatch({ type: 'SET_DRAGGING', payload: false })
      isDraggingRef.current = false
      wasDraggingRef.current = true // Mark that we were dragging
      savePosition(state.ui.position)
    }
  }, [state.ui.position, savePosition])

  // Global event listeners for drag with proper cleanup
  React.useEffect(() => {
    const mouseUpHandler = () => handleMouseUp()
    const touchEndHandler = () => handleTouchEnd()
    
    if (state.ui.isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', mouseUpHandler, { passive: false })
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', touchEndHandler, { passive: false })
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', mouseUpHandler)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', touchEndHandler)
    }
  }, [state.ui.isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Optimized window resize handler
  React.useEffect(() => {
    const handleResize = () => {
      dispatch({ type: 'SET_WINDOW_SIZE', payload: { width: window.innerWidth, height: window.innerHeight } })
      
      // Adjust position if button goes off screen
      dispatch({ type: 'SET_POSITION', payload: {
        x: Math.min(state.ui.position.x, window.innerWidth - memoizedDimensions.BUTTON_SIZE),
        y: Math.min(state.ui.position.y, window.innerHeight - memoizedDimensions.BUTTON_SIZE)
      }})
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [memoizedDimensions.BUTTON_SIZE, state.ui.position.x, state.ui.position.y])

  React.useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && state.ui.showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler, { passive: true })
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [state.ui.showForm, triggerClose])

  // Comprehensive cleanup for all timers and listeners
  React.useEffect(() => {
    return () => {
      // Clear all timers
      if (voiceRecordingTimerRef.current) {
        clearTimeout(voiceRecordingTimerRef.current)
        voiceRecordingTimerRef.current = null
      }
      
      if (voiceDetectionTimerRef.current) {
        clearTimeout(voiceDetectionTimerRef.current)
        voiceDetectionTimerRef.current = null
      }
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      
      // Clear error rate limiting timer
      if (errorRateRef.current.cooldownTimer) {
        clearTimeout(errorRateRef.current.cooldownTimer)
        errorRateRef.current.cooldownTimer = null
      }
      
      // Stop any active recording
      if (mediaRecorderRef.current && state.recording.isRecording) {
        try {
          mediaRecorderRef.current.stop()
        } catch (error) {
          console.warn('Error stopping media recorder on cleanup:', error)
        }
      }
      
      // Clear audio chunks
      audioChunksRef.current = []
      
      // Remove all event listeners
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('keydown', handleGlobalKeys)
      document.removeEventListener('mousedown', () => {}) // clickOutsideHandler
      window.removeEventListener('resize', () => {}) // handleResize
    }
  }, []) // Empty dependency array for cleanup on unmount

  // Additional cleanup when recording state changes
  React.useEffect(() => {
    if (!state.recording.isRecording && mediaRecorderRef.current) {
      // Ensure media recorder is properly stopped
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      } catch (error) {
        console.warn('Error stopping media recorder on state change:', error)
      }
    }
  }, [state.recording.isRecording])

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
    formData.append('sessionId', state.chat.sessionId)
    formData.append('userId', user.walletAddress)
    formData.append('username', user.username)
    
    if (audioBlob) {
      formData.append('audio', audioBlob, 'voice-message.webm')
    }

    try {
      const response = await connectionPool.execute(async () => {
        return await retryWithBackoff(async () => {
      const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), connectionConfig.chatTimeout)

          try {
            const response = await fetch(`${connectionConfig.baseUrl}${connectionConfig.chatEndpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
            return response
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        })
      })

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
  }, [addError, state.chat.sessionId, retryWithBackoff, connectionConfig, connectionPool])

  /**
   * Stop voice recording and send
   */
  const stopVoiceRecording = React.useCallback(() => {
    console.log('Stopping voice recording...', { 
      hasMediaRecorder: !!mediaRecorderRef.current, 
      isRecording: state.recording.isRecording,
      recorderState: mediaRecorderRef.current?.state 
    })
    
    if (mediaRecorderRef.current && state.recording.isRecording) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
          console.log('MediaRecorder stop() called')
        } else {
          console.log('MediaRecorder not in recording state:', mediaRecorderRef.current.state)
          dispatch({ type: 'SET_RECORDING', payload: false })
          mediaRecorderRef.current = null
        }
      } catch (error) {
        const errorObj = error as Error
        addError(ChatErrorCode.RECORDING_STOP_FAILED, 'Failed to stop recording', {
          error: errorObj.message,
          timestamp: new Date().toISOString()
        })
        dispatch({ type: 'SET_RECORDING', payload: false })
        mediaRecorderRef.current = null
        console.error('Error stopping recording:', error)
      }
    } else if (state.recording.isRecording) {
      // State inconsistency detected - force reset
      addError(ChatErrorCode.RECORDING_STATE_STUCK, 'Recording state inconsistent', {
        hasMediaRecorder: !!mediaRecorderRef.current,
        isRecording: state.recording.isRecording,
        timestamp: new Date().toISOString()
      })
      dispatch({ type: 'SET_RECORDING', payload: false })
      mediaRecorderRef.current = null
      console.warn('Force reset recording state due to inconsistency')
    }
  }, [state.recording.isRecording, addError])


  /**
   * Handle text message submission
   */
  const handleTextSubmit = React.useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault()
    }

    const message = textareaRef.current?.value?.trim()
    if (!message || state.chat.isLoading || state.recording.isRecording) return

    // Clear input immediately to prevent double submission
    if (textareaRef.current) {
      textareaRef.current.value = ''
    }

    dispatch({ type: 'SET_LOADING', payload: true })

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: message,
      type: 'text',
      timestamp: new Date(),
      isUser: true
    }
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage })

    try {
      // Check if prediction mode is enabled and if this is a betting-related query
      const bettingKeywords = [
        'bet', 'wager', 'gamble', 'stake', 'risk', 'place', 'put', 'make',
        'lakers', 'celtics', 'warriors', 'bulls', 'chiefs', 'eagles', 'cowboys', 
        'max verstappen', 'lewis hamilton', 'verstappen', 'hamilton', 'f1', 'formula 1',
        'core', 'usdc', 'eth', 'bitcoin', 'btc', 'crypto', 'token'
      ]
      const isBettingQuery = bettingKeywords.some(keyword =>
        message.toLowerCase().includes(keyword.toLowerCase())
      )

      console.log('🎯 Betting Detection:', {
        message: message.toLowerCase(),
        predictionMode: state.betting.predictionMode,
        isBettingQuery,
        matchedKeywords: bettingKeywords.filter(keyword => 
          message.toLowerCase().includes(keyword.toLowerCase())
        )
      })

      if (state.betting.predictionMode && isBettingQuery) {
        // Use simple betting handler when prediction mode is enabled
        console.log('🎯 Prediction Mode: Using simple betting handler')
        
        // Add debug message showing prediction mode is active
        const debugMessage: ChatMessage = {
          id: `debug_${Date.now()}`,
          content: `🎯 **PREDICTION MODE**\n\n✅ Betting query: "${message}"\n🔧 Processing...`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        dispatch({ type: 'ADD_MESSAGE', payload: debugMessage })
        
        await handleSimpleBetRequest(message)
        return // Don't continue to LLM fallback
      } else if (state.betting.predictionMode && !isBettingQuery) {
        // Prediction mode is on but not a betting query - use LLM for intelligent responses
        console.log('🎯 Prediction Mode: Using LLM for non-betting query')
        
        try {
          const llmResponse = await llmService.generateChatResponse(message, { 
            bettingContext: state.betting.bettingContext,
            userHistory: state.chat.messages.slice(-5),
            predictionMode: true,
            mode: 'prediction'
          })
          
          if (llmResponse.success && llmResponse.data) {
            const aiMessage: ChatMessage = {
              id: `ai_${Date.now()}`,
              content: llmResponse.data,
              type: 'text',
              timestamp: new Date(),
              isUser: false
            }
            dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })
          } else {
            throw new Error('LLM response failed')
          }
        } catch (llmError) {
          console.warn('LLM failed in prediction mode, showing mode-specific response:', llmError)
          const modeMessage: ChatMessage = {
            id: `ai_${Date.now()}`,
            content: `🎯 **PREDICTION MODE**\n\nReady for betting queries.\n\nExamples:\n• "bet 10 USD on Lakers"\n• "0.01 CORE on Max Verstappen"\n• "50 USDC on Warriors"`,
            type: 'text',
            timestamp: new Date(),
            isUser: false
          }
          dispatch({ type: 'ADD_MESSAGE', payload: modeMessage })
        }
        return
      } else {
        // Regular chat message - try LLM first, then fallback to backend
        try {
          const llmResponse = await llmService.generateChatResponse(message, { 
            bettingContext: state.betting.bettingContext,
            userHistory: state.chat.messages.slice(-5),
            predictionMode: false,
            mode: 'normal'
          })
          
          if (llmResponse.success && llmResponse.data) {
            const aiMessage: ChatMessage = {
              id: `ai_${Date.now()}`,
              content: llmResponse.data,
              type: 'text',
              timestamp: new Date(),
              isUser: false
            }
            dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })
          } else {
            throw new Error('LLM response failed')
          }
        } catch (error) {
          console.warn('LLM chat failed, falling back to backend:', error)
          
          try {
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
            dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })

          // Handle voice response
          if (response.type === 'voice' && response.audioUrl) {
            const audio = new Audio(response.audioUrl)
            audio.play()
          }
          } catch (backendError) {
            console.warn('Backend also failed, using offline response:', backendError)
            
            // Final fallback - offline response
            const offlineMessage: ChatMessage = {
              id: `ai_${Date.now()}`,
              content: `🤖 **OFFLINE**\n\nBackend unavailable at http://127.0.0.1:8001\n\nMessage: "${message}"\n\nRetrying when connection restored.`,
              type: 'text',
              timestamp: new Date(),
              isUser: false
            }
            dispatch({ type: 'ADD_MESSAGE', payload: offlineMessage })
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
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.chat.isLoading, state.recording.isRecording, sendMessageToBackend, getErrorMessage, state.betting.predictionMode, handleSimpleBetRequest, llmService])

  /**
   * Handle voice message submission
   */
  const handleVoiceSubmission = React.useCallback(async (audioBlob: Blob) => {
    if (state.chat.isLoading) return

    dispatch({ type: 'SET_LOADING', payload: true })
    
    // Add user voice message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: '[Voice Message]',
      type: 'voice',
      timestamp: new Date(),
      isUser: true
    }
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage })

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
      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage })

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
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.chat.isLoading, sendMessageToBackend, getErrorMessage])

  /**
   * Start voice recording
   */
  const startVoiceRecording = React.useCallback(async () => {
    // Prevent multiple recordings
    if (state.recording.isRecording) {
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
          dispatch({ type: 'SET_RECORDING', payload: false })
          mediaRecorderRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        const errorEvent = event as any // MediaRecorder error events have error property
        addError(ChatErrorCode.RECORDING_START_FAILED, 'MediaRecorder error', {
          error: errorEvent.error?.name || 'Unknown error'
        })
        dispatch({ type: 'SET_RECORDING', payload: false })
        stream.getTracks().forEach(track => track.stop())
        mediaRecorderRef.current = null
      }

      mediaRecorder.start()
      dispatch({ type: 'SET_RECORDING', payload: true })
      console.log('Voice recording started')
    } catch (error) {
      const errorObj = error as Error
      dispatch({ type: 'SET_RECORDING', payload: false })
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
  }, [state.recording.isRecording, addError, handleVoiceSubmission])



  /**
   * Handle text send button click
   */
  const handleTextSend = React.useCallback(() => {
    const message = textareaRef.current?.value?.trim()
    if (message && !state.chat.isLoading && !state.recording.isRecording) {
      handleTextSubmit()
    }
  }, [state.chat.isLoading, state.recording.isRecording, handleTextSubmit])

  /**
   * Handle voice button mouse down - start voice recording
   */
  const handleVoiceMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!state.recording.isRecording && !state.chat.isLoading) {
      startVoiceRecording()
    }
  }, [state.recording.isRecording, state.chat.isLoading, startVoiceRecording])

  /**
   * Handle voice button mouse up - stop voice recording
   */
  const handleVoiceMouseUp = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (state.recording.isRecording) {
      stopVoiceRecording()
    }
  }, [state.recording.isRecording, stopVoiceRecording])

  /**
   * Handle voice button touch start - start voice recording
   */
  const handleVoiceTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!state.recording.isRecording && !state.chat.isLoading) {
      startVoiceRecording()
    }
  }, [state.recording.isRecording, state.chat.isLoading, startVoiceRecording])

  /**
   * Handle voice button touch end - stop voice recording
   */
  const handleVoiceTouchEnd = React.useCallback(() => {
    if (state.recording.isRecording) {
      stopVoiceRecording()
    }
  }, [state.recording.isRecording, stopVoiceRecording])

  const handleKeys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      triggerClose()
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const message = textareaRef.current?.value?.trim()
      if (message && !state.chat.isLoading && !state.recording.isRecording) {
        handleTextSubmit()
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const message = textareaRef.current?.value?.trim()
      if (message && !state.chat.isLoading && !state.recording.isRecording) {
        handleTextSubmit()
      }
    }
  }

  // Keyboard shortcuts for voice recording
  const handleGlobalKeys = React.useCallback((e: KeyboardEvent) => {
    if (state.ui.showForm && !state.chat.isLoading) {
      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault()
        if (state.recording.isRecording) {
          stopVoiceRecording()
        } else {
          startVoiceRecording()
        }
      }
    }
  }, [state.ui.showForm, state.chat.isLoading, state.recording.isRecording, startVoiceRecording, stopVoiceRecording])

  // Add global keyboard listener with proper cleanup
  React.useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeys, { passive: false })
    return () => document.removeEventListener('keydown', handleGlobalKeys)
  }, [handleGlobalKeys])

  return (
    <>
      {/* Background Blur Overlay */}
      {state.ui.showForm && (
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

      {/* Hell Racer Banner - Grouped with Chat Window */}
      {state.ui.showForm && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: state.ui.isDragging ? 1.1 : 1,
            x: state.ui.isDragging ? 0 : 0
          }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ 
            duration: 0.4, 
            ease: "easeInOut",
            scale: { duration: 0.2, ease: "easeOut" }
          }}
          style={{
            position: 'fixed',
            top: state.ui.position.y - (memoizedDimensions.isMobile ? 100 : 140), // Position above the chat window
            left: state.ui.position.x,
            zIndex: 1001, // Above the chat window
            width: memoizedDimensions.FORM_WIDTH, // Match chat window width
            height: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none', // Allow clicks to pass through
            transformOrigin: 'center center',
          }}
        >
          <motion.img 
            src={hellracerBanner} 
            alt="Hell Racer Banner"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: state.ui.isDragging ? 1.15 : 1,
              opacity: 1,
              filter: state.ui.isDragging 
                ? 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.6)) brightness(1.1)' 
                : 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))'
            }}
            transition={{ 
              duration: 0.3, 
              ease: "easeInOut",
              scale: { duration: 0.2, ease: "easeOut" }
            }}
            style={{
              width: '100%',
              height: memoizedDimensions.isMobile ? '80px' : '120px', // Increased size
              maxWidth: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              transition: 'all 0.3s ease',
            }}
          />
        </motion.div>
      )}

      {/* Prediction Mode Slider - Integrated with Chat Window */}
      {state.ui.showForm && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: state.ui.isDragging ? 1.05 : 1,
          }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ 
            duration: 0.4, 
            ease: "easeInOut",
            delay: 0.2,
            scale: { duration: 0.2, ease: "easeOut" }
          }}
          style={{
            position: 'fixed',
            top: state.ui.position.y + memoizedDimensions.FORM_HEIGHT + 15, // Position below the chat window
            left: state.ui.position.x + memoizedDimensions.FORM_WIDTH - 120, // Position from left edge of chat window
            zIndex: 1001, // Above the chat window
            pointerEvents: 'auto', // Allow interaction
            transformOrigin: 'center center',
          }}
        >
          <div 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dispatch({ type: 'SET_PREDICTION_MODE', payload: !state.betting.predictionMode })
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: memoizedDimensions.isMobile ? '4px' : '8px',
              background: 'rgba(15, 15, 15, 0.9)',
              border: `1px solid ${state.betting.predictionMode ? '#ffd700' : 'rgba(220, 38, 38, 0.2)'}`,
              borderRadius: '8px',
              padding: memoizedDimensions.isMobile ? '3px 6px' : '6px 12px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: state.betting.predictionMode 
                ? '0 4px 16px rgba(255, 215, 0, 0.4)' 
                : '0 4px 16px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              minWidth: memoizedDimensions.isMobile ? '70px' : '100px',
              width: 'fit-content',
            }}>
              
              {/* Mode Label */}
              <div style={{
                fontSize: memoizedDimensions.isMobile ? '0.6rem' : '0.7rem',
                color: state.betting.predictionMode ? '#ffd700' : 'var(--text-muted)',
                fontFamily: 'Consolas, "Courier New", monospace',
                fontWeight: 'bold',
                textShadow: state.betting.predictionMode ? '0 0 4px rgba(255, 215, 0, 0.5)' : 'none',
                letterSpacing: memoizedDimensions.isMobile ? '0.1px' : '0.3px',
                whiteSpace: 'nowrap',
              }}>
                {memoizedDimensions.isMobile ? 'PRED' : 'PREDICTION'}
              </div>
              
              {/* Minimalist Toggle */}
              <div style={{
                position: 'relative',
                width: memoizedDimensions.isMobile ? '24px' : '28px',
                height: memoizedDimensions.isMobile ? '12px' : '14px',
                background: state.betting.predictionMode ? '#ffd700' : 'rgba(60, 60, 60, 0.6)',
                borderRadius: '7px',
                transition: 'all 0.3s ease',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                {/* Slider Handle */}
                <div style={{
                  position: 'absolute',
                  top: '1px',
                  left: state.betting.predictionMode ? (memoizedDimensions.isMobile ? '13px' : '15px') : '1px',
                  width: memoizedDimensions.isMobile ? '10px' : '12px',
                  height: memoizedDimensions.isMobile ? '10px' : '12px',
                  background: '#ffffff',
                  borderRadius: '50%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }} />
              </div>
            </div>
        </motion.div>
      )}

      {/* AI Chat Assistant */}
      <div 
        className={`ai-chat-assistant ${className}`}
        style={{
          position: 'fixed',
          left: state.ui.position.x,
          top: state.ui.position.y,
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
      >
      <motion.div
        ref={wrapperRef}
        className="ai-chat-panel"
        style={{
          background: state.ui.showForm ? 'var(--bg-card)' : 'transparent',
          border: state.ui.showForm ? '2px solid var(--border-accent)' : 'none',
          boxShadow: state.ui.showForm 
            ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(220, 38, 38, 0.3), var(--shadow-glow)' 
            : 'none',
          borderRadius: state.ui.showForm ? '14px' : '50%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          cursor: state.ui.showForm ? 'default' : (state.ui.isDragging ? 'grabbing' : 'grab'),
          userSelect: 'none',
          touchAction: 'auto', // Allow normal touch behavior
        }}
        initial={false}
        animate={{
          width: state.ui.showForm ? memoizedDimensions.FORM_WIDTH : memoizedDimensions.BUTTON_SIZE,
          height: state.ui.showForm ? memoizedDimensions.FORM_HEIGHT : memoizedDimensions.BUTTON_SIZE,
          scale: state.ui.isDragging ? 1.1 : (state.ui.isDragReady ? 1.05 : (state.ui.showForm ? 1.05 : 1)),
          opacity: state.ui.isDragging ? 0.9 : (state.ui.isDragReady ? 0.8 : 1),
          filter: state.ui.isDragReady ? 'hue-rotate(240deg) saturate(2) brightness(1.2)' : 'hue-rotate(0deg) saturate(1)',
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8,
          delay: state.ui.showForm ? 0 : 0.05,
          filter: { duration: 0.3, ease: "easeInOut" },
        }}
      >
         {/* Animated AI Button - Only show when form is closed */}
         {!state.ui.showForm && (
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
             aria-expanded={state.ui.showForm}
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
             {state.ui.isDragReady && !state.ui.isDragging && (
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
                 animation: state.ui.isDragReady ? 'buttonSpin 0.5s linear infinite' : 'none',
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
                   {state.recording.isRecording && ' Currently recording voice message.'}
                   {state.chat.isLoading && ' Processing your message.'}
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
        {state.ui.showForm && (
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
          {state.ui.showForm && (
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
                  <span 
                    className={bettingModeDisplay.isActive ? 'terminal-glow' : ''}
                    style={{
                      color: bettingModeDisplay.titleColor,
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 'normal',
                    textTransform: 'none',
                    letterSpacing: '0.5px',
                      textShadow: bettingModeDisplay.titleShadow,
                  }}>
                    &gt;_ DAREDEVIL_ANALYSIS_TERMINAL
                  </span>
                  
                  {/* Oracle Mode Indicator */}
                  {bettingModeDisplay.isActive && (
                    <div 
                      className="oracle-flash"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 165, 0, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                      }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#ff8c00',
                        borderRadius: '50%',
                        animation: 'oracleBlink 0.8s ease-in-out infinite',
                      }} />
                      <span style={{
                        color: '#ff8c00',
                        fontSize: '0.7rem',
                        fontFamily: 'Consolas, "Courier New", monospace',
                        fontWeight: 'bold',
                        textShadow: '0 0 4px rgba(255, 140, 0, 0.5)',
                      }}>
                        ORACLE
                      </span>
                      
                      {/* Connection Indicator */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        marginLeft: '4px',
                      }}>
                        {/* WiFi Signal Bars */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'end',
                          gap: '1px',
                          height: '8px',
                        }}>
                          {/* Bar 1 */}
                          <div 
                            className={connectionStatusDisplay.isConnecting ? 'connection-pulse' : ''}
                            style={{
                              width: '2px',
                              height: connectionStatusDisplay.isConnected ? '3px' : connectionStatusDisplay.isConnecting ? '2px' : '1px',
                              background: connectionStatusDisplay.statusColor,
                              borderRadius: '1px',
                            }} />
                          {/* Bar 2 */}
                          <div 
                            className={connectionStatusDisplay.isConnecting ? 'connection-pulse' : ''}
                            style={{
                              width: '2px',
                              height: connectionStatusDisplay.isConnected ? '5px' : connectionStatusDisplay.isConnecting ? '3px' : '1px',
                              background: connectionStatusDisplay.statusColor,
                              borderRadius: '1px',
                            }} />
                          {/* Bar 3 */}
                          <div 
                            className={connectionStatusDisplay.isConnecting ? 'connection-pulse' : ''}
                            style={{
                              width: '2px',
                              height: connectionStatusDisplay.isConnected ? '7px' : connectionStatusDisplay.isConnecting ? '4px' : '1px',
                              background: connectionStatusDisplay.statusColor,
                              borderRadius: '1px',
                            }} />
                          {/* Bar 4 */}
                          <div 
                            className={connectionStatusDisplay.isConnecting ? 'connection-pulse' : ''}
                            style={{
                              width: '2px',
                              height: connectionStatusDisplay.isConnected ? '8px' : connectionStatusDisplay.isConnecting ? '5px' : '1px',
                              background: connectionStatusDisplay.statusColor,
                              borderRadius: '1px',
                            }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side - Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'SET_DEBUG_MODE', payload: !state.ui.debugMode })}
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'transparent',
                      border: 'none',
                      color: state.chat.errors.length > 0 ? 'var(--accent-red)' : 'var(--accent-cyan)',
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
                    title={state.chat.errors.length > 0 ? `${state.chat.errors.length} errors detected` : 'Debug mode'}
                    aria-label={state.chat.errors.length > 0 ? `${state.chat.errors.length} errors detected. Click to view debug panel.` : 'Toggle debug mode'}
                    aria-pressed={state.ui.debugMode}
                    tabIndex={0}
                  >
                    {state.chat.errors.length > 0 ? '⚠️' : '🔧'}
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
              {state.ui.debugMode && (
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
                      onClick={() => dispatch({ type: 'CLEAR_ERRORS' })}
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
                  {state.chat.errors.length === 0 ? (
                    <div style={{ color: 'var(--accent-green)' }}>✅ No errors detected</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {state.chat.errors.slice(-5).map((error, index) => (
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
                      {state.chat.errors.length > 5 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textAlign: 'center' }}>
                          ... and {state.chat.errors.length - 5} more errors
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Connection Status */}
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '4px', 
                    background: connectionStatusDisplay.isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    border: `1px solid ${connectionStatusDisplay.isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, 
                    borderRadius: '3px',
                    fontSize: '0.65rem'
                  }}>
                    <div style={{ color: connectionStatusDisplay.statusColor, fontWeight: 'bold', marginBottom: '2px' }}>
                      Backend Connection
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Status: {state.connection.status.toUpperCase()}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      URL: {connectionConfig.baseUrl}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Prediction Mode: {state.betting.predictionMode ? 'ON' : 'OFF'}
                    </div>
                  </div>
                  
                  {/* Error Rate Limiting Status */}
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '4px', 
                    background: 'rgba(255, 193, 7, 0.1)', 
                    border: '1px solid rgba(255, 193, 7, 0.3)', 
                    borderRadius: '3px',
                    fontSize: '0.65rem'
                  }}>
                    <div style={{ color: 'var(--accent-yellow)', fontWeight: 'bold', marginBottom: '2px' }}>
                      Error Rate Limiting
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Recent: {errorRateRef.current.errorHistory.filter(e => Date.now() - e.timestamp < 60000).length}/5 per minute
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Hourly: {errorRateRef.current.errorHistory.length}/20 per hour
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Consecutive: {errorRateRef.current.consecutiveErrors}/3
                    </div>
                    {errorRateRef.current.isInCooldown && (
                      <div style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>
                        ⏳ Cooldown Active
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* 3D Blob Background - Fixed Position */}
              <BlobBackground 
                width={memoizedDimensions.FORM_WIDTH} 
                height={memoizedDimensions.FORM_HEIGHT - 200}
                isVisible={state.recording.isRecording}
                isVoiceDetected={state.recording.isVoiceDetected}
              />

              {/* Messages Area */}
              <div 
                ref={virtualScrollRef}
                className="hide-scrollbar"
                onScroll={handleScroll}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  paddingBottom: '16px',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
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
                  {/* Virtualized Messages */}
                  {shouldVirtualize ? (
                    <>
                      {/* Spacer for items before visible range */}
                      {visibleRange.start > 0 && (
                        <div style={{ height: visibleRange.start * VIRTUAL_CONFIG.itemHeight }} />
                      )}
                      
                      {/* Render visible messages */}
                      {state.chat.messages.slice(visibleRange.start, visibleRange.end + 1).map((message, index) => (
                        <VirtualizedMessage 
                          key={message.id} 
                          message={message} 
                          index={visibleRange.start + index} 
                        />
                      ))}
                      
                      {/* Spacer for items after visible range */}
                      {visibleRange.end < state.chat.messages.length - 1 && (
                        <div style={{ height: (state.chat.messages.length - visibleRange.end - 1) * VIRTUAL_CONFIG.itemHeight }} />
                      )}
                    </>
                  ) : (
                    /* Fallback to regular rendering for small message counts */
                    state.chat.messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{
                        maxWidth: '85%',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        background: message.isUser 
                          ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(30, 64, 175, 0.9))' 
                          : 'linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(25, 25, 25, 0.9))',
                        color: message.isUser ? '#ffffff' : '#f0f0f0',
                        fontSize: '0.9rem',
                        border: message.isUser 
                          ? '1px solid rgba(59, 130, 246, 0.3)' 
                          : '1px solid rgba(220, 38, 38, 0.4)',
                        fontFamily: 'var(--font-primary)',
                        lineHeight: '1.6',
                        boxShadow: message.isUser 
                          ? '0 8px 32px rgba(30, 58, 138, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                          : '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        animation: 'messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        overflow: 'hidden',
                      }}>
                        {!message.isUser && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
                            fontSize: '0.8rem',
                          }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                              background: 'rgba(220, 38, 38, 0.1)',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              border: '1px solid rgba(220, 38, 38, 0.3)',
                            }}>
                              <div style={{
                                width: '6px',
                                height: '6px',
                                background: 'var(--accent-red)',
                                borderRadius: '50%',
                                animation: 'pulse 2s ease-in-out infinite',
                              }} />
                              <span style={{ 
                                color: 'var(--accent-red)', 
                                fontWeight: 'bold',
                                textShadow: '0 0 8px rgba(220, 38, 38, 0.5)',
                              }}>
                              &gt;_ DareDevil
                            </span>
                            </div>
                            <span style={{ 
                              color: 'var(--accent-cyan)', 
                              fontSize: '0.75rem',
                              opacity: 0.9,
                              textShadow: '0 0 4px rgba(6, 182, 212, 0.3)',
                            }}>
                              @Agent_Hellracer
                            </span>
                          </div>
                        )}
                        {/* Subtle background pattern for AI messages */}
                        {!message.isUser && (
                        <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `
                              radial-gradient(circle at 20% 20%, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
                              radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.02) 0%, transparent 50%),
                              linear-gradient(45deg, transparent 30%, rgba(220, 38, 38, 0.01) 50%, transparent 70%)
                            `,
                            pointerEvents: 'none',
                            zIndex: 0,
                          }} />
                        )}
                        
                        <div style={{ 
                          marginBottom: '8px',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontSize: '0.9rem',
                          lineHeight: '1.4',
                          whiteSpace: 'pre-wrap',
                          position: 'relative',
                          zIndex: 1,
                          textShadow: message.isUser ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)',
                          letterSpacing: '0.3px',
                        }}>
                          {renderMessageContent(message.content)}
                        </div>
                        {message.qrCodeUrl && (
                          <div style={{ 
                            marginTop: '20px',
                            display: 'flex',
                            justifyContent: 'center',
                            width: '100%'
                          }}>
                            <QRCodeDisplay url={message.qrCodeUrl} size={200} />
                          </div>
                        )}
                        {!message.isUser && (
                          <div style={{
                            fontSize: '0.7rem',
                            color: 'rgba(220, 38, 38, 0.7)',
                            marginBottom: '6px',
                            textAlign: 'left',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            textShadow: '0 0 4px rgba(220, 38, 38, 0.3)',
                            letterSpacing: '0.5px',
                          }}>
                            PREDICTION ENGINE v2.5
                          </div>
                        )}
                        <div style={{
                          fontSize: '0.7rem',
                          color: message.isUser ? 'rgba(255, 255, 255, 0.7)' : 'rgba(240, 240, 240, 0.6)',
                          textAlign: message.isUser ? 'right' : 'left',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          textShadow: message.isUser ? '0 1px 2px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.4)',
                          letterSpacing: '0.3px',
                        }}>
                          {message.timestamp.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                  {state.chat.isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(25, 25, 25, 0.9))',
                        color: '#f0f0f0',
                        fontSize: '0.9rem',
                        border: '1px solid rgba(220, 38, 38, 0.4)',
                        fontFamily: 'var(--font-primary)',
                        lineHeight: '1.6',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        overflow: 'hidden',
                        animation: 'messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '12px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
                          fontSize: '0.8rem',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                            background: 'rgba(220, 38, 38, 0.1)',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              background: 'var(--accent-red)',
                              borderRadius: '50%',
                              animation: 'pulse 1s ease-in-out infinite',
                            }} />
                            <span style={{ 
                              color: 'var(--accent-red)', 
                              fontWeight: 'bold',
                              textShadow: '0 0 8px rgba(220, 38, 38, 0.5)',
                            }}>
                            &gt;_ DareDevil
                          </span>
                          </div>
                            <span style={{ 
                              color: 'var(--accent-cyan)', 
                              fontSize: '0.75rem',
                              opacity: 0.9,
                              textShadow: '0 0 4px rgba(6, 182, 212, 0.3)',
                            }}>
                              {state.betting.predictionMode ? 'Prediction Engine' : 'NBA Analytics Expert'}
                          </span>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid var(--accent-cyan)',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginLeft: '8px',
                            filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))'
                          }} />
                        </div>
                        <div style={{ 
                          marginBottom: '8px',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontSize: '0.9rem',
                          lineHeight: '1.4',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                          letterSpacing: '0.3px',
                        }}>
                          🔄 Processing your request... Analyzing data and generating response.
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'rgba(220, 38, 38, 0.7)',
                          marginBottom: '6px',
                          textAlign: 'left',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          textShadow: '0 0 4px rgba(220, 38, 38, 0.3)',
                          letterSpacing: '0.5px',
                        }}>
                          PREDICTION ENGINE v2.5 - ACTIVE
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'rgba(240, 240, 240, 0.6)',
                          textAlign: 'left',
                          fontFamily: 'Consolas, "Courier New", monospace',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                          letterSpacing: '0.3px',
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
                        disabled={state.chat.isLoading}
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
                        {state.recording.isRecording && ' Voice recording is active. Release voice button to stop.'}
                      </div>
                      
                      {/* Voice recording indicator */}
                      {state.recording.isRecording && (
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
                      disabled={state.chat.isLoading}
                      onMouseDown={handleVoiceMouseDown}
                      onMouseUp={handleVoiceMouseUp}
                      onTouchStart={handleVoiceTouchStart}
                      onTouchEnd={handleVoiceTouchEnd}
                      className={`button-hover ${state.recording.isRecording ? 'recording-pulse' : ''}`}
                      style={{
                        width: '52px',
                        height: '52px',
                        background: state.recording.isRecording 
                          ? 'linear-gradient(135deg, var(--accent-red) 0%, var(--accent-red) 50%, #b91c1c 100%)' 
                          : 'linear-gradient(135deg, var(--accent-red) 0%, #b91c1c 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        cursor: state.chat.isLoading ? 'not-allowed' : 'pointer',
                        opacity: state.chat.isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: state.recording.isRecording 
                          ? '0 0 20px rgba(220, 38, 38, 0.8), 0 4px 12px rgba(220, 38, 38, 0.4)' 
                          : '0 4px 12px rgba(220, 38, 38, 0.3)',
                      }}
                      onMouseEnter={(e) => {
                        if (!state.chat.isLoading && !state.recording.isRecording) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!state.chat.isLoading && !state.recording.isRecording) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                        }
                      }}
                      title={state.recording.isRecording ? "Release to stop recording" : "Hold to record voice message"}
                      aria-label={state.recording.isRecording ? "Stop voice recording" : "Start voice recording"}
                      aria-pressed={state.recording.isRecording}
                      tabIndex={0}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                      }}>
                        {state.recording.isRecording ? (
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
                      disabled={state.chat.isLoading}
                      onClick={handleTextSend}
                      className="button-hover"
                      style={{
                        width: '52px',
                        height: '52px',
                        background: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: '12px',
                        color: 'var(--accent-red)',
                        cursor: state.chat.isLoading ? 'not-allowed' : 'pointer',
                        opacity: state.chat.isLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                        backdropFilter: 'blur(10px)',
                      }}
                      onMouseEnter={(e) => {
                        if (!state.chat.isLoading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!state.chat.isLoading) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.2)';
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!state.chat.isLoading) {
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.3)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.8), inset 0 2px 4px rgba(220, 38, 38, 0.3)';
                          e.currentTarget.style.transform = 'translateY(0) scale(0.95)';
                        }
                      }}
                      onMouseUp={(e) => {
                        if (!state.chat.isLoading) {
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
      {state.betting.bettingContext && (
        <ExpertAdviceModal
          isOpen={state.betting.showExpertAdvice}
          onClose={() => dispatch({ type: 'SET_SHOW_EXPERT_ADVICE', payload: false })}
          context={{
            betAmount: state.betting.bettingIntent.amount || 0,
            betType: 'single',
            sport: state.betting.bettingIntent.sport || 'unknown',
            userHistory: {
              totalBets: 0, // Would be fetched from user's betting history
              winRate: 0,
              avgBetSize: 0
            }
          }}
        />
      )}

      {/* Optimized CSS Animations with GPU acceleration */}
      <style>
        {`
          /* Performance-optimized animations using transform3d and will-change */
          .optimized-animation {
            will-change: transform, opacity, box-shadow;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            perspective: 1000px;
          }
          
          .message-slide-in {
            animation: messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            will-change: transform, opacity;
            transform: translate3d(0, 0, 0);
          }
          
          .button-hover {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform, box-shadow;
            transform: translate3d(0, 0, 0);
          }
          
          .button-hover:hover {
            transform: translate3d(0, -2px, 0);
          }
          
          .recording-pulse {
            animation: recordingPulse 1.5s ease-in-out infinite;
            will-change: box-shadow;
          }
          
          .connection-pulse {
            animation: connectionPulse 1s ease-in-out infinite;
            will-change: opacity;
          }
          
          .oracle-flash {
            animation: oracleFlash 1.5s ease-in-out infinite, oracleSlideIn 0.6s ease-in-out;
            will-change: box-shadow, transform, opacity;
            transform: translate3d(0, 0, 0);
          }
          
          .terminal-glow {
            animation: terminalGlow 2s ease-in-out infinite;
            will-change: text-shadow;
          }
          
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
            }
          }
          
          @keyframes messageSlideIn {
            0% {
              opacity: 0;
              transform: translate3d(0, 20px, 0) scale(0.95);
            }
            50% {
              opacity: 0.8;
              transform: translate3d(0, -5px, 0) scale(1.02);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }
          
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          
          @keyframes recordingPulse {
            0%, 100% {
              box-shadow: 0 0 20px rgba(220, 38, 38, 0.8), 0 4px 12px rgba(220, 38, 38, 0.4);
            }
            50% {
              box-shadow: 0 0 30px rgba(220, 38, 38, 1), 0 6px 20px rgba(220, 38, 38, 0.6);
            }
          }
          
          @keyframes buttonSpin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          
          @keyframes dragReadySpin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          
          @keyframes iconPulse {
            0%, 100% {
              opacity: 0.15;
              transform: translate3d(-50%, -50%, 0) scale(1);
            }
            50% {
              opacity: 0.25;
              transform: translate3d(-50%, -50%, 0) scale(1.1);
            }
          }
          
          @keyframes consoleBlink {
            0%, 50% {
              opacity: 1;
            }
            51%, 100% {
              opacity: 0.3;
            }
          }
          
          @keyframes qrShine {
            0% {
              left: -100%;
            }
            50% {
              left: 100%;
            }
            100% {
              left: 100%;
            }
          }
          
          @keyframes oracleFlash {
            0%, 100% {
              opacity: 1;
              box-shadow: 0 0 0 0 rgba(255, 165, 0, 0.4);
            }
            50% {
              opacity: 0.7;
              box-shadow: 0 0 0 4px rgba(255, 165, 0, 0.1);
            }
          }
          
          @keyframes oracleBlink {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.3;
              transform: scale(0.8);
            }
          }
          
          @keyframes terminalGlow {
            0%, 100% {
              textShadow: 0 0 10px rgba(255, 255, 255, 0.6);
              transform: scale(1);
            }
            50% {
              textShadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.4);
              transform: scale(1.02);
            }
          }
          
          @keyframes oracleSlideIn {
            0% {
              opacity: 0;
              transform: translate3d(-20px, 0, 0) scale(0.8);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }
          
          @keyframes connectionPulse {
            0%, 100% {
              opacity: 0.6;
              transform: scale3d(1, 1, 1);
            }
            50% {
              opacity: 1;
              transform: scale3d(1, 1.2, 1);
            }
          }
        `}
      </style>
    </>
  )
}

export default AIChatAssistant
