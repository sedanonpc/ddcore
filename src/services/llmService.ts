import { BettingIntent, QuestionFlow, BettingContext } from './mcpService'

/**
 * LLM Service for natural language processing
 * Handles OpenRouter API integration for enhanced betting intent parsing
 */

export interface LLMResponse {
  success: boolean
  data?: any
  error?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface LLMConfig {
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

export class LLMService {
  private static instance: LLMService
  private config: LLMConfig

  constructor() {
    this.config = {
      apiKey: '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',
      model: 'deepseek/deepseek-chat',
      temperature: 0.1,
      maxTokens: 500
    }
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService()
    }
    return LLMService.instance
  }

  /**
   * Parse natural language betting intent using LLM
   */
  async parseBettingIntent(message: string): Promise<LLMResponse> {
    const prompt = `You are a sports betting assistant for DAREDEVIL platform. Parse this user message and extract betting information.

User message: "${message}"

Available sports and competitors from our database:
- Basketball: lakers, celtics, warriors, bulls, knicks, heat, okc (thunder), indiana (pacers)
- F1: max verstappen, lewis hamilton, charles leclerc, lando norris, george russell, red bull, mercedes, ferrari, mclaren
- Soccer: argentina, brazil, france, spain
- Wrestling: roman reigns, seth rollins, drew mcintyre, john cena, brock lesnar, randy orton

Return ONLY a JSON object with the betting intent. Include:
- amount: number (if mentioned, otherwise null)
- currency: "USD" | "CORE" | "ETH" (default to "CORE")
- competitor: string (exact name from available list, or null if not found)
- sport: "basketball" | "f1" | "soccer" | "wrestling" (or null if not found)
- riskTolerance: "conservative" | "moderate" | "aggressive" (default to "moderate")
- confidence: number (0-1, how confident you are in the parsing)

Example response: {"amount": 50, "currency": "CORE", "competitor": "max verstappen", "sport": "f1", "riskTolerance": "moderate", "confidence": 0.9}`

    return this.callOpenRouter(prompt)
  }

  /**
   * Generate contextual questions for incomplete betting intents
   */
  async generateGuidingQuestions(context: BettingContext): Promise<LLMResponse> {
    const prompt = `You are a sports betting assistant. Generate contextual questions to help complete a betting intent.

Current context:
- User ID: ${context.userId}
- Intent: ${JSON.stringify(context.intent)}
- Available matches: ${context.matches.length} matches
- Available competitors: ${Object.keys(context.availableCompetitors).length} competitors

Generate 1-3 specific questions to help complete the betting intent. Return ONLY a JSON array of question objects:
[
  {
    "id": "question_id",
    "question": "Natural language question",
    "type": "selection" | "input" | "numeric" | "confirmation",
    "options": ["option1", "option2"] (only for selection type),
    "required": true/false,
    "context": "Why this question is being asked"
  }
]

Focus on missing critical information like amount, competitor, or sport.`

    return this.callOpenRouter(prompt)
  }

  /**
   * Generate expert advice for betting context
   */
  async generateExpertAdvice(context: BettingContext): Promise<LLMResponse> {
    const prompt = `You are a sports betting expert providing risk assessment and advice.

Betting Context:
- Amount: ${context.intent.amount || 'Not specified'}
- Currency: ${context.intent.currency || 'CORE'}
- Competitor: ${context.intent.competitor || 'Not specified'}
- Sport: ${context.intent.sport || 'Not specified'}
- Risk Tolerance: ${context.intent.riskTolerance || 'moderate'}

Provide expert analysis in JSON format:
{
  "riskLevel": "low" | "medium" | "high" | "extreme",
  "advice": ["advice item 1", "advice item 2"],
  "warnings": ["warning 1", "warning 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "educationalContent": [
    {
      "title": "Topic title",
      "content": "Educational content",
      "source": "Source reference"
    }
  ]
}

Focus on responsible gambling, risk management, and educational content.`

    return this.callOpenRouter(prompt)
  }

  /**
   * Generate natural language responses for chat
   */
  async generateChatResponse(message: string, context?: any): Promise<LLMResponse> {
    const prompt = `You are DareDevil, an AI sports betting assistant with a confident, knowledgeable personality. 

User message: "${message}"

Context: ${context ? JSON.stringify(context) : 'No additional context'}

Respond naturally and helpfully. If this is a betting request, guide them through the process. If it's a general question, provide helpful information about sports betting, our platform, or sports in general.

Keep responses concise but informative. Use emojis sparingly and maintain a professional yet engaging tone.`

    return this.callOpenRouter(prompt)
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouter(prompt: string): Promise<LLMResponse> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'DAREDEVIL Sports Betting'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content in LLM response')
      }

      return {
        success: true,
        data: content,
        usage: data.usage
      }

    } catch (error: any) {
      console.error('LLM API call failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Parse JSON response from LLM
   */
  parseJSONResponse(response: string): any {
    try {
      // Clean the response - remove any markdown formatting
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      return JSON.parse(cleanedResponse)
    } catch (error) {
      console.error('Failed to parse LLM JSON response:', error)
      throw new Error('Invalid JSON response from LLM')
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const llmService = LLMService.getInstance()