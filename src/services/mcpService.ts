import { matchDataService } from '../utils/matchData'
import { dareDevilMCPClient } from './mcpClient'
import { llmService } from './llmService'

/**
 * MCP Service Types
 */
export interface BettingIntent {
  amount: number
  currency: string
  competitor: string
  sport: string
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  userPreferences?: any
}

export interface GuidingQuestion {
  id: string
  question: string
  type: 'input' | 'selection' | 'numeric' | 'confirmation'
  options?: string[]
  required: boolean
}

export interface QuestionFlow {
  questions: GuidingQuestion[]
  context: BettingContext
  completionPercentage: number
  canProceed: boolean
  currentQuestionIndex?: number
}

export interface BettingContext {
  userId: string
  intent: Partial<BettingIntent>
  matches: any[]
  availableCompetitors: Record<string, any>
  riskAssessment: RiskAssessment
}

export interface RiskAssessment {
  level: 'low' | 'moderate' | 'high' | 'extreme'
  factors: string[]
  recommendation: string
  confidence: number
}

export interface MCPResponse {
  success: boolean
  action: string
  data?: any
  message?: string
  nextSteps?: string[]
  requiresUserAction?: boolean
}

export interface ExpertAdvice {
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme'
  advice: string[]
  warnings: string[]
  recommendations: string[]
  shouldProceed: boolean
}

export interface MatchCriteria {
  sport: string
  teams: string[]
  timeframe?: string
}

export interface QRCodeData {
  betId: string
  shareableUrl: string
  qrCodeBase64: string
  expiresAt: Date
}

/**
 * Enhanced MCP Service Implementation
 */
export class MCPService {
  private static instance: MCPService

  public static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService()
    }
    return MCPService.instance
  }

  constructor() {
    console.log('🚀 MCPService initialized')
  }

  /**
   * Initialize MCP connection
   */
  async initialize(): Promise<void> {
    try {
      await dareDevilMCPClient.connect()
      console.log('✅ MCP Service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize MCP Service:', error)
      throw error
    }
  }

  /**
   * Parse natural language betting intent
   */
  async parseBettingIntent(message: string): Promise<BettingIntent> {
    try {
      // Try LLM parsing first
      const llmResponse = await llmService.parseBettingIntent(message)
      if (llmResponse.success && llmResponse.data) {
        const parsedIntent = llmService.parseJSONResponse(llmResponse.data)
        const validatedIntent: BettingIntent = {
          amount: parsedIntent.amount || 0,
          currency: parsedIntent.currency || 'CORE',
          competitor: parsedIntent.competitor || '',
          sport: parsedIntent.sport || '',
          riskTolerance: parsedIntent.riskTolerance || 'moderate',
          userPreferences: parsedIntent.userPreferences
        }
        console.log('✅ LLM parsed intent:', validatedIntent)
        return validatedIntent
      }
    } catch (error) {
      console.warn('⚠️ LLM parsing failed, falling back to regex:', error)
    }

    // Fallback to improved regex parsing
    const intent: Partial<BettingIntent> = {}

    // Enhanced amount parsing with various patterns
    const improvedAmountMatch = message.match(/(\d+(?:\.\d{2})?)\s*(?:\$|USD|CORE|ETH|dollars?)?/i)
    if (improvedAmountMatch) {
      intent.amount = parseFloat(improvedAmountMatch[1])
      // Determine currency from context
      intent.currency = message.toLowerCase().includes('core') ? 'CORE' :
                       message.toLowerCase().includes('eth') ? 'ETH' : 'USD'
    }

    // Enhanced sports and team recognition
    const sportsKeywords = {
      basketball: ['lakers', 'celtics', 'warriors', 'bulls', 'knicks', 'heat', 'okc', 'thunder', 'pacers', 'indiana'],
      football: ['chiefs', 'eagles', 'cowboys', 'packers', 'patriots', '49ers'],
      f1: ['max verstappen', 'lewis hamilton', 'charles leclerc', 'lando norris', 'george russell', 'verstappen', 'hamilton', 'leclerc', 'norris', 'russell', 'red bull', 'mercedes', 'ferrari', 'mclaren'],
      soccer: ['argentina', 'brazil', 'france', 'spain', 'arg', 'bra', 'fra', 'esp'],
      wrestling: ['roman reigns', 'seth rollins', 'drew mcintyre', 'john cena', 'brock lesnar', 'randy orton', 'reigns', 'rollins', 'mcintyre', 'cena', 'lesnar', 'orton']
    }

    for (const [sport, teams] of Object.entries(sportsKeywords)) {
      const foundTeams = teams.filter(team =>
        message.toLowerCase().includes(team.toLowerCase())
      )
      if (foundTeams.length > 0) {
        intent.sport = sport
        intent.competitor = foundTeams[0]
        break
      }
    }

    // Set defaults
    if (!intent.currency) intent.currency = 'CORE'
    if (!intent.riskTolerance) intent.riskTolerance = 'moderate'

    console.log('✅ Regex fallback parsed intent:', intent)
    return intent as BettingIntent
  }

  /**
   * Generate the next guiding question (step-by-step approach)
   */
  async generateNextQuestion(context: BettingContext): Promise<QuestionFlow> {
    const { intent } = context
    const questions: GuidingQuestion[] = []

    // Determine what information is missing and ask ONE question at a time
    if (!intent.amount || intent.amount <= 0) {
      questions.push({
        id: 'amount',
        question: 'How much would you like to bet?',
        type: 'numeric',
        required: true
      })
    } else if (!intent.competitor) {
      questions.push({
        id: 'competitor',
        question: 'Which team or player do you want to bet on?',
        type: 'input',
        required: true
      })
    } else if (!intent.sport) {
      questions.push({
        id: 'sport',
        question: 'Which sport is this bet for?',
        type: 'selection',
        options: ['Basketball', 'Football', 'Formula 1', 'Soccer', 'Wrestling'],
        required: true
      })
    } else if (intent.amount && intent.amount > 500) {
      // Only ask about risk tolerance for larger bets
      questions.push({
        id: 'risk_tolerance',
        question: 'This appears to be a larger bet. What\'s your risk tolerance?',
        type: 'selection',
        options: ['Conservative', 'Moderate', 'Aggressive'],
        required: false
      })
    } else {
      // All required info collected, generate confirmation
      questions.push({
        id: 'confirmation',
        question: this.generateConfirmationText(context),
        type: 'confirmation',
        required: true
      })
    }

    return {
      questions,
      context,
      completionPercentage: this.calculateCompletionPercentage(intent),
      canProceed: this.canProceedWithIntent(intent),
      currentQuestionIndex: 0
    }
  }

  /**
   * Process answer to a guiding question
   */
  async processQuestionAnswer(
    context: BettingContext, 
    questionId: string, 
    answer: string
  ): Promise<{ updatedContext: BettingContext; nextQuestion?: GuidingQuestion; canProceed: boolean }> {
    const updatedContext = { ...context }
    const updatedIntent = { ...context.intent }

    // Process the answer based on question type
    switch (questionId) {
      case 'amount':
        const amount = parseFloat(answer.replace(/[$,]/g, ''))
        if (!isNaN(amount) && amount > 0) {
          updatedIntent.amount = amount
        }
        break

      case 'competitor':
        updatedIntent.competitor = answer.trim()
        break

      case 'sport':
        updatedIntent.sport = answer.toLowerCase()
        break

      case 'risk_tolerance':
        updatedIntent.riskTolerance = answer.toLowerCase() as any
        break

      case 'confirmation':
        if (answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('confirm')) {
          // User confirmed, ready to proceed
          updatedContext.intent = updatedIntent
          return {
            updatedContext,
            canProceed: true
          }
        } else {
          // User declined, ask what they want to change
          return {
            updatedContext: context, // Don't update if declined
            nextQuestion: {
              id: 'modification',
              question: 'What would you like to change about your bet?',
              type: 'input',
              required: true
            },
            canProceed: false
          }
        }
    }

    updatedContext.intent = updatedIntent

    // Generate next question
    const nextQuestionFlow = await this.generateNextQuestion(updatedContext)
    
    return {
      updatedContext,
      nextQuestion: nextQuestionFlow.questions[0],
      canProceed: nextQuestionFlow.canProceed
    }
  }

  /**
   * Create bet using MCP tools
   */
  async createAutonomousBet(intent: BettingIntent, match: any): Promise<MCPResponse> {
    try {
      console.log('🚀 Creating bet via MCP client with intent:', intent)
      console.log('🏆 Using match:', match)

      // Use MCP client to create the bet
      const result = await dareDevilMCPClient.createBet(
        match.id,
        intent.competitor,
        intent.amount,
        intent.currency
      )

      console.log('✅ MCP bet creation result:', result)

      if (result.success) {
        // Generate QR code for sharing
        const qrCodeData = await this.generateQRCode(result.betId!)

        return {
          success: true,
          action: 'bet_created',
          data: {
            betId: result.betId,
            nftTokenId: result.nftTokenId,
            transactionHash: result.transactionHash,
            qrCode: qrCodeData,
            shareableUrl: result.shareableUrl
          },
          message: result.message,
          nextSteps: [
            'Share the QR code with friends to challenge them',
            'Monitor the bet status in your dashboard',
            'Wait for someone to accept your challenge'
          ]
        }
      } else {
        return {
          success: false,
          action: 'bet_creation_failed',
          message: result.message,
          requiresUserAction: true
        }
      }

    } catch (error: any) {
      console.error('❌ Failed to create autonomous bet via MCP:', error)
      
      return {
        success: false,
        action: 'bet_creation_failed',
        message: `Failed to create bet: ${error.message}`,
        requiresUserAction: true
      }
    }
  }

  /**
   * Get available matches using MCP tools
   */
  async getAvailableMatches(sport?: string, limit: number = 10): Promise<any[]> {
    try {
      return await dareDevilMCPClient.getMatches(sport, 'upcoming', limit)
    } catch (error: any) {
      console.error('❌ Failed to get matches via MCP:', error)
      return []
    }
  }

  /**
   * Create autonomous match if none exists
   */
  async createAutonomousMatch(criteria: MatchCriteria): Promise<any> {
    // First, check if there are existing matches that fit the criteria
    const allMatches = matchDataService.getAllMatches()
    const sportMatches = allMatches.filter(match => {
      const league = matchDataService.getLeague(match.leagueID) // Fixed from getLeagueById
      return league?.sport === criteria.sport
    })

    if (sportMatches.length === 0) {
      // Create a placeholder match for testing
      return this.createPlaceholderMatch(criteria)
    }

    // Return the first match that fits the criteria
    return sportMatches[0]
  }

  /**
   * Create a placeholder match for testing/development
   */
  private createPlaceholderMatch(criteria: MatchCriteria): any {
    const matchId = `auto-${Date.now()}`
    const currentDate = new Date()
    const futureDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

    return {
      id: matchId,
      title: `${criteria.sport.toUpperCase()} Match`,
      subtitle: `${criteria.teams.join(' vs ')}`,
      leagueID: `auto-${criteria.sport}`,
      location: 'TBD',
      scheduledDateInUTC: futureDate.toISOString(),
      competitorIDs: criteria.teams,
      conference: 'Auto-Generated'
    }
  }

  /**
   * Generate expert advice for a betting context
   */
  async generateExpertAdvice(context: BettingContext): Promise<ExpertAdvice> {
    const { intent } = context
    const advice: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    let riskLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'low'

    // Assess risk based on bet amount
    if (intent.amount) {
      if (intent.amount > 1000) {
        riskLevel = 'extreme'
        warnings.push('This is a very large bet amount. Consider the potential loss carefully.')
        warnings.push('Only bet what you can afford to lose completely.')
      } else if (intent.amount > 500) {
        riskLevel = 'high'
        warnings.push('This is a significant bet amount. Make sure you understand the risks.')
      } else if (intent.amount > 100) {
        riskLevel = 'moderate'
        advice.push('This is a moderate bet amount. Good for steady betting strategy.')
      } else {
        riskLevel = 'low'
        advice.push('This is a conservative bet amount. Good for learning and low-risk betting.')
      }
    }

    // General betting advice
    advice.push('Research the teams/competitors before placing your bet.')
    advice.push('Set a budget and stick to it.')
    advice.push('Never chase losses with bigger bets.')

    // Recommendations
    recommendations.push('Start with smaller amounts if you\'re new to betting.')
    recommendations.push('Keep track of your betting history.')
    recommendations.push('Take breaks between betting sessions.')

    return {
      riskLevel,
      advice,
      warnings,
      recommendations,
      shouldProceed: riskLevel !== 'extreme'
    }
  }

  /**
   * Generate confirmation text for the betting context
   */
  private generateConfirmationText(context: BettingContext): string {
    const { intent } = context
    return `Ready to create your bet: ${intent.amount} ${intent.currency} on ${intent.competitor} in ${intent.sport}. Confirm?`
  }

  /**
   * Calculate completion percentage of betting intent
   */
  private calculateCompletionPercentage(intent: Partial<BettingIntent>): number {
    const requiredFields = ['amount', 'competitor', 'sport']
    const completedFields = requiredFields.filter(field => 
      intent[field as keyof BettingIntent] !== undefined && 
      intent[field as keyof BettingIntent] !== null &&
      intent[field as keyof BettingIntent] !== ''
    )
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  /**
   * Check if we can proceed with the current intent
   */
  private canProceedWithIntent(intent: Partial<BettingIntent>): boolean {
    return !!(intent.amount && intent.amount > 0 && intent.competitor && intent.sport)
  }

  /**
   * Get guided betting prompt from MCP server
   */
  async getGuidedBettingPrompt(userPreferences?: any, sportFilter?: string): Promise<string> {
    try {
      const prompt = await dareDevilMCPClient.getGuidedBettingPrompt(userPreferences, sportFilter)
      if (prompt && prompt.content) {
        return prompt.content
      }
      return 'I can help you create a bet! What sport are you interested in?'
    } catch (error) {
      console.error('Failed to get guided betting prompt via MCP:', error)
      return 'I can help you create a bet! What sport are you interested in?'
    }
  }

  /**
   * Generate QR code for bet sharing
   */
  private async generateQRCode(betId: string): Promise<QRCodeData> {
    const baseUrl = window.location.origin
    const shareableUrl = `${baseUrl}/invite/${betId}`

    // Create a proper visual QR code representation
    const qrCodeBase64 = await this.createVisualQRCode(shareableUrl)

    return {
      betId,
      shareableUrl,
      qrCodeBase64,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  }

  /**
   * Create a visual QR code representation
   */
  private async createVisualQRCode(data: string): Promise<string> {
    try {
      // Create a canvas-based QR code representation
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }
      
      const size = 200
      canvas.width = size
      canvas.height = size
      
      // Fill with white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      
      // Create QR-like pattern
      ctx.fillStyle = '#000000'
      
      // Draw border
      ctx.fillRect(0, 0, size, 20)
      ctx.fillRect(0, 0, 20, size)
      ctx.fillRect(size - 20, 0, 20, size)
      ctx.fillRect(0, size - 20, size, 20)
      
      // Draw pattern blocks
      const blockSize = 10
      for (let x = 30; x < size - 30; x += blockSize * 2) {
        for (let y = 30; y < size - 30; y += blockSize * 2) {
          if ((x + y) % 40 === 0 || data.charCodeAt((x + y) % data.length) % 2 === 0) {
            ctx.fillRect(x, y, blockSize, blockSize)
          }
        }
      }
      
      // Draw corner squares (typical QR code features)
      const cornerSize = 40
      const innerSize = 20
      
      // Top-left corner
      ctx.fillRect(20, 20, cornerSize, cornerSize)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(30, 30, innerSize, innerSize)
      
      // Top-right corner
      ctx.fillStyle = '#000000'
      ctx.fillRect(size - 60, 20, cornerSize, cornerSize)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(size - 50, 30, innerSize, innerSize)
      
      // Bottom-left corner
      ctx.fillStyle = '#000000'
      ctx.fillRect(20, size - 60, cornerSize, cornerSize)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(30, size - 50, innerSize, innerSize)
      
      // Add DAREDEVIL branding
      ctx.fillStyle = '#ff0000'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('DAREDEVIL', size / 2, size - 10)
      
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Failed to create QR code:', error)
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  }
}

// Export singleton instance
export const mcpService = MCPService.getInstance()