import { browserMCPClient } from './mcpBrowserClient'

/**
 * MCP Client Types
 */
export interface MCPClientBetResult {
  success: boolean
  message: string
  betId?: string
  nftTokenId?: string
  transactionHash?: string
  shareableUrl?: string
}

export interface MCPClientMatch {
  id: string
  title: string
  sport: string
  status: string
  scheduledDate: string
  competitors: string[]
}

export interface MCPClientBet {
  betId: string
  status: string
  amount: number
  creator: string
  acceptor?: string
  winner?: string
  matchId: string
  createdAt: string
}

export interface MCPClientResource {
  uri: string
  name: string
  description?: string
  data?: any
}

export interface MCPClientPrompt {
  name: string
  description?: string
  content: string
}

/**
 * Main MCP Client wrapper for browser compatibility
 */
export class DareDevilMCPClient {
  private connected: boolean = false

  constructor() {
    console.log('🚀 DareDevilMCPClient initialized')
  }

  async connect(): Promise<void> {
    try {
      await browserMCPClient.connect()
      this.connected = true
      console.log('✅ MCP Client connected successfully')
    } catch (error) {
      console.error('❌ Failed to connect MCP client:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      await browserMCPClient.disconnect()
      this.connected = false
      console.log('❌ MCP Client disconnected')
    } catch (error) {
      console.error('❌ Failed to disconnect MCP client:', error)
      throw error
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && browserMCPClient.isConnected()
  }

  /**
   * Create a new bet using MCP tools
   */
  async createBet(
    matchId: string,
    competitor: string,
    amount: number,
    currency: string = 'CORE'
  ): Promise<MCPClientBetResult> {
    if (!this.connected) {
      await this.connect()
    }

    try {
      const result = await browserMCPClient.createBet(matchId, competitor, amount, currency)
      return result
    } catch (error: any) {
      console.error('❌ MCP createBet failed:', error)
      return {
        success: false,
        message: `Failed to create bet: ${error.message}`
      }
    }
  }

  /**
   * Get available matches using MCP tools
   */
  async getMatches(
    sport?: string,
    status: string = 'upcoming',
    limit: number = 10
  ): Promise<MCPClientMatch[]> {
    if (!this.connected) {
      await this.connect()
    }

    try {
      const result = await browserMCPClient.getMatches(sport, status, limit)
      
      // Convert MCPMatchResult to MCPClientMatch[]
      if (result.success && result.matches) {
        return result.matches.map((match: any) => ({
          id: match.id,
          title: match.title || 'Unknown Match',
          sport: match.sport || 'Unknown',
          status: status,
          scheduledDate: match.scheduledDateInUTC || new Date().toISOString(),
          competitors: match.competitorIDs || []
        }))
      }
      
      return []
    } catch (error: any) {
      console.error('❌ MCP getMatches failed:', error)
      return []
    }
  }

  /**
   * Get bet status using MCP tools
   */
  async getBetStatus(betId: string): Promise<MCPClientBet | null> {
    if (!this.connected) {
      await this.connect()
    }

    try {
      const result = await browserMCPClient.getBetStatus(betId)
      
      // Convert MCPToolResult to MCPClientBet
      if (result.success && result.data) {
        const bet = result.data
        return {
          betId: bet.id || betId,
          status: bet.status || 'unknown',
          amount: bet.amount?.value || 0,
          creator: bet.creator?.walletAddress || 'unknown',
          acceptor: bet.acceptor?.walletAddress,
          winner: bet.winner?.walletAddress,
          matchId: bet.matchID || 'unknown',
          createdAt: bet.createdAt || new Date().toISOString()
        }
      }
      
      return null
    } catch (error: any) {
      console.error('❌ MCP getBetStatus failed:', error)
      return null
    }
  }

  /**
   * Get user bets (placeholder - not implemented in browser client)
   */
  async getUserBets(
    status?: string,
    limit: number = 10
  ): Promise<MCPClientBet[]> {
    console.warn('❌ getUserBets not implemented in browser MCP client')
    return []
  }

  /**
   * Get available tools
   */
  async getAvailableTools(): Promise<any[]> {
    if (!this.connected) {
      await this.connect()
    }

    try {
      const result = await browserMCPClient.listTools()
      
      // Convert MCPListToolsResult to array
      return result.tools || []
    } catch (error: any) {
      console.error('❌ MCP getAvailableTools failed:', error)
      return []
    }
  }

  /**
   * Get MCP resources (placeholder - simplified)
   */
  async getResources(): Promise<any[]> {
    if (!this.connected) {
      await this.connect()
    }

    try {
      const result = await browserMCPClient.listResources()
      
      // Convert to simple array format
      return result.resources || []
    } catch (error: any) {
      console.error('❌ MCP listResources failed:', error)
      return []
    }
  }

  /**
   * Get guided betting prompt (placeholder)
   */
  async getGuidedBettingPrompt(
    userPreferences?: any,
    sportFilter?: string
  ): Promise<MCPClientPrompt | null> {
    console.warn('❌ getGuidedBettingPrompt not implemented in browser MCP client')
    return null
  }

  /**
   * Get betting strategy advice (placeholder)
   */
  async getBettingStrategyAdvice(
    betAmount: number,
    riskTolerance: string
  ): Promise<any> {
    console.warn('❌ getBettingStrategyAdvice not implemented in browser MCP client')
    return null
  }

  /**
   * List MCP prompts (placeholder)
   */
  async listPrompts(): Promise<MCPClientPrompt[]> {
    console.warn('❌ listPrompts not implemented in browser MCP client')
    return []
  }
}

// Export singleton instance
export const dareDevilMCPClient = new DareDevilMCPClient()