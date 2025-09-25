import { blockchainService } from './blockchain'
import { supabaseService } from './supabase'
import { matchDataService } from '../utils/matchData'
import { BetMetadata } from '../types'

/**
 * Browser-compatible MCP client implementation
 * Provides a simplified interface for bet creation
 */

export interface MCPBetResult {
  success: boolean
  message: string
  betId?: string
  nftTokenId?: string
  transactionHash?: string
  shareableUrl?: string
}

/**
 * Browser MCP Client for bet creation
 */
export class BrowserMCPClient {
  private connected = false

  async connect(): Promise<void> {
    this.connected = true
    console.log('✅ Browser MCP client connected')
  }

  async disconnect(): Promise<void> {
    this.connected = false
    console.log('❌ Browser MCP client disconnected')
  }

  isConnected(): boolean {
    return this.connected
  }

  async createBet(
    matchId: string,
    competitor: string,
    amount: number,
    currency: string = 'CORE'
  ): Promise<MCPBetResult> {
    console.log('🚀 === BET CREATION DEBUG START ===')
    console.log('📝 Input parameters:', { matchId, competitor, amount, currency })

    try {
      // STEP 1: Debug wallet status
      console.log('🔍 Step 1 - Debugging wallet status')
      const user = blockchainService.getCurrentUser()
      console.log('🔍 User from blockchain service:', user)
      
      if (!user) {
        console.log('❌ FAILURE: No user found')
        return {
          success: false,
          message: 'User authentication required. Please connect your wallet.'
        }
      }

      // STEP 2: Check blockchain initialization
      console.log('🔍 Step 2 - Checking blockchain initialization')
      const isInitialized = blockchainService.isInitialized()
      console.log('🔍 Blockchain initialized:', isInitialized)
      
      if (!isInitialized) {
        console.log('❌ FAILURE: Blockchain not initialized')
        return {
          success: false,
          message: 'Blockchain service not initialized. Please connect your wallet first.'
        }
      }

      // STEP 3: Get match data
      console.log('🔍 Step 3 - Getting match data')
      const match = matchDataService.getMatch(matchId)
      console.log('🔍 Match data:', match)
      
      if (!match) {
        console.log('❌ FAILURE: Match not found')
        return {
          success: false,
          message: `Match with ID ${matchId} not found`
        }
      }

      // STEP 4: Get league data
      console.log('🔍 Step 4 - Getting league data')
      const league = matchDataService.getLeague(match.leagueID)
      console.log('🔍 League data:', league)

      // STEP 5: Get competitors
      console.log('🔍 Step 5 - Getting competitors')
      const competitors = matchDataService.getLeagueCompetitors(match.leagueID)
      console.log('🔍 Competitors:', competitors)

      // STEP 6: Generate bet metadata
      console.log('🔍 Step 6 - Generating bet metadata')
      const betMetadata: BetMetadata = {
        bet: {
          id: '', // Will be set after blockchain creation
          matchID: matchId,
          amount: { value: amount, currency },
          creator: {
            username: user.username,
            walletAddress: user.walletAddress,
            selectedCompetitorID: competitor
          },
          acceptor: undefined,
          winner: undefined,
          status: 'open' as const,
          aiPrediction: undefined,
          nftID: '', // Will be set after blockchain creation
          selectedCompetitorID: competitor
        },
        match: {
          id: match.id,
          leagueID: match.leagueID,
          location: match.location,
          scheduledDateInUTC: match.scheduledDateInUTC,
          title: match.title,
          subtitle: match.subtitle,
          competitorIDs: match.competitorIDs || [],
          conference: match.conference
        },
        league: league || {
          id: match.leagueID,
          name: `${match.leagueID} League`,
          sport: 'unknown',
          imageURL: ''
        },
        matchCompetitors: competitors || {}
      }
      console.log('✅ Bet metadata generated:', betMetadata)

      // STEP 7: Upload metadata to Supabase
      console.log('🔍 Step 7 - Uploading metadata to Supabase')
      const metadataURI = await supabaseService.uploadMetadata(
        `temp-${Date.now()}`,
        betMetadata
      )
      console.log('✅ Metadata uploaded:', metadataURI)

      // STEP 8: Create bet on blockchain (THIS IS WHERE THE TRANSACTION SHOULD HAPPEN)
      console.log('🔍 Step 8 - Creating bet on blockchain')
      console.log('🚨 CRITICAL: This should trigger MetaMask transaction prompt!')
      
      const { betId, nftTokenId, transactionHash } = await blockchainService.createBet(
        matchId,
        competitor,
        amount.toString(),
        metadataURI
      )
      
      console.log('✅ BLOCKCHAIN TRANSACTION COMPLETED!')
      console.log('📝 Transaction details:', { betId, nftTokenId, transactionHash })

      // STEP 9: Update metadata with actual IDs
      console.log('🔍 Step 9 - Updating metadata with blockchain results')
      betMetadata.bet.id = betId.toString()
      betMetadata.bet.nftID = nftTokenId.toString()

      await supabaseService.uploadMetadata(betId.toString(), betMetadata)
      console.log('✅ Metadata updated with blockchain results')

      // STEP 10: Generate shareable URL
      const shareableUrl = `${window.location.origin}/invite/${betId}`
      console.log('✅ Shareable URL generated:', shareableUrl)

      console.log('✅ === BET CREATION SUCCESS ===')
      console.log('🎉 All steps completed successfully!')

      return {
        success: true,
        message: 'Bet created successfully!',
        betId: betId.toString(),
        nftTokenId: nftTokenId.toString(),
        transactionHash,
        shareableUrl
      }

    } catch (error: any) {
      console.error('❌ Failed to create bet via MCP:', error)
      return {
        success: false,
        message: `Failed to create bet: ${error.message}`
      }
    } finally {
      console.log('🏁 === BET CREATION DEBUG END ===')
    }
  }

  // Placeholder methods for other MCP functions
  async getMatches(sport?: string, status: string = 'upcoming', limit: number = 10): Promise<{ success: boolean; matches: any[] }> {
    console.warn('❌ getMatches not implemented in browser MCP client')
    return { success: true, matches: [] }
  }

  async getBetStatus(betId: string): Promise<{ success: boolean; data: any }> {
    console.warn('❌ getBetStatus not implemented in browser MCP client')
    return { success: true, data: null }
  }

  async listTools(): Promise<{ success: boolean; tools: any[] }> {
    console.warn('❌ listTools not implemented in browser MCP client')
    return { success: true, tools: [] }
  }

  async listResources(): Promise<{ success: boolean; resources: any[] }> {
    console.warn('❌ listResources not implemented in browser MCP client')
    return { success: true, resources: [] }
  }
}

// Export singleton instance
export const browserMCPClient = new BrowserMCPClient()