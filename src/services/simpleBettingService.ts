import { blockchainService } from './blockchain'
import { supabaseService } from './supabase'
import { BetMetadata, Bet, Match, League, Competitor, BetParticipant, BetAmount } from '../types'

/**
 * Simple Betting Service - Direct blockchain integration
 * Bypasses all MCP complexity for reliable bet creation
 */

export interface SimpleBetIntent {
  amount: number
  currency: string
  competitor: string
  sport: string
}

export interface SimpleBetResult {
  success: boolean
  betId?: string
  nftTokenId?: string
  transactionHash?: string
  shareableUrl?: string
  qrCode?: string
  error?: string
}

/**
 * Parse betting intent from natural language
 */
export function parseSimpleBetIntent(message: string): SimpleBetIntent | null {
  console.log('🔍 Parsing simple bet intent from:', message)
  
  const intent: Partial<SimpleBetIntent> = {}
  
  // Parse amount
  const amountMatch = message.match(/(\d+(?:\.\d{2})?)\s*(?:\$|USD|CORE|ETH|dollars?)?/i)
  if (amountMatch) {
    intent.amount = parseFloat(amountMatch[1])
    intent.currency = message.toLowerCase().includes('core') ? 'CORE' :
                     message.toLowerCase().includes('eth') ? 'ETH' : 'USD'
  }
  
  // Parse competitor and sport
  const sportsKeywords = {
    basketball: ['lakers', 'celtics', 'warriors', 'bulls', 'knicks', 'heat'],
    football: ['chiefs', 'eagles', 'cowboys', 'packers', 'patriots', '49ers'],
    f1: ['max verstappen', 'lewis hamilton', 'charles leclerc', 'lando norris', 'verstappen', 'hamilton', 'leclerc', 'norris'],
    soccer: ['argentina', 'brazil', 'france', 'spain'],
    wrestling: ['roman reigns', 'seth rollins', 'drew mcintyre', 'john cena']
  }
  
  for (const [sport, competitors] of Object.entries(sportsKeywords)) {
    const foundCompetitor = competitors.find(comp =>
      message.toLowerCase().includes(comp.toLowerCase())
    )
    if (foundCompetitor) {
      intent.sport = sport
      intent.competitor = foundCompetitor
      break
    }
  }
  
  // Validate required fields
  if (!intent.amount || !intent.competitor || !intent.sport) {
    console.log('❌ Missing required fields:', intent)
    return null
  }
  
  console.log('✅ Parsed intent:', intent)
  return intent as SimpleBetIntent
}

/**
 * Create a simple match for the bet
 */
function createSimpleMatch(intent: SimpleBetIntent): Match {
  return {
    id: `match_${Date.now()}`,
    leagueID: `league_${intent.sport}`,
    location: {
      title: 'Virtual Arena'
    },
    scheduledDateInUTC: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    title: `${intent.competitor} vs Opponent`,
    subtitle: `${intent.sport.toUpperCase()} Match`,
    competitorIDs: [`comp_${intent.competitor.replace(/\s+/g, '_')}`, 'comp_opponent']
  }
}

/**
 * Generate QR code for bet sharing
 */
function generateSimpleQRCode(betId: string): string {
  const baseUrl = window.location.origin
  const shareableUrl = `${baseUrl}/invite/${betId}`
  
  // Create a simple QR code representation
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return ''
  
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
      if ((x + y) % 40 === 0 || betId.charCodeAt((x + y) % betId.length) % 2 === 0) {
        ctx.fillRect(x, y, blockSize, blockSize)
      }
    }
  }
  
  // Add DAREDEVIL branding
  ctx.fillStyle = '#ff0000'
  ctx.font = 'bold 12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('DAREDEVIL', size / 2, size - 10)
  
  return canvas.toDataURL('image/png')
}

/**
 * Create bet directly on blockchain
 */
export async function createSimpleBet(intent: SimpleBetIntent): Promise<SimpleBetResult> {
  console.log('🚀 === SIMPLE BET CREATION START ===')
  console.log('📝 Intent:', intent)
  
  try {
    // Step 1: Validate wallet connection
    console.log('🔍 Step 1: Validating wallet connection...')
    if (!blockchainService.isInitialized()) {
      console.log('❌ Blockchain not initialized')
      return {
        success: false,
        error: 'Wallet not connected. Please connect your MetaMask wallet first.'
      }
    }
    
    const user = blockchainService.getCurrentUser()
    if (!user) {
      console.log('❌ No user found')
      return {
        success: false,
        error: 'User not authenticated. Please connect your wallet.'
      }
    }
    
    console.log('✅ Wallet validation passed')
    
    // Step 2: Create simple match
    console.log('🔍 Step 2: Creating simple match...')
    const match = createSimpleMatch(intent)
    console.log('✅ Match created:', match)
    
    // Step 3: Create bet metadata with proper structure
    console.log('🔍 Step 3: Creating bet metadata...')
    const betMetadata: BetMetadata = {
      bet: {
        id: '',
        matchID: match.id,
        creator: {
          username: user.username,
          walletAddress: user.walletAddress,
          selectedCompetitorID: `comp_${intent.competitor.replace(/\s+/g, '_')}`
        },
        acceptor: undefined,
        amount: {
          currency: intent.currency,
          value: intent.amount
        },
        selectedCompetitorID: `comp_${intent.competitor.replace(/\s+/g, '_')}`,
        status: 'open' as const,
        winner: undefined,
        aiPrediction: undefined,
        nftID: undefined
      },
      match: match,
      league: {
        id: `league_${intent.sport}`,
        name: `${intent.sport.toUpperCase()} League`,
        sport: intent.sport,
        imageURL: ''
      },
      matchCompetitors: {
        [`comp_${intent.competitor.replace(/\s+/g, '_')}`]: {
          id: `comp_${intent.competitor.replace(/\s+/g, '_')}`,
          name: intent.competitor,
          abbreviation: intent.competitor.split(' ').map(n => n[0]).join('').toUpperCase(),
          imageURL: ''
        },
        'comp_opponent': {
          id: 'comp_opponent',
          name: 'Opponent',
          abbreviation: 'OPP',
          imageURL: ''
        }
      }
    }
    
    // Step 4: Upload metadata to Supabase
    console.log('🔍 Step 4: Uploading metadata...')
    const metadataURI = await supabaseService.uploadMetadata(`temp-${Date.now()}`, betMetadata)
    console.log('✅ Metadata uploaded:', metadataURI)
    
    // Step 5: Create bet on blockchain
    console.log('🔍 Step 5: Creating bet on blockchain...')
    const { betId, nftTokenId, transactionHash } = await blockchainService.createBet(
      match.id,
      intent.competitor,
      intent.amount.toString(),
      metadataURI
    )
    console.log('✅ Bet created on blockchain:', { betId, nftTokenId, transactionHash })
    
    // Step 6: Update metadata with bet ID
    console.log('🔍 Step 6: Updating metadata with bet ID...')
    betMetadata.bet.id = betId.toString()
    betMetadata.bet.nftID = nftTokenId.toString()
    const finalMetadataURI = await supabaseService.uploadMetadata(betId.toString(), betMetadata)
    console.log('✅ Final metadata uploaded:', finalMetadataURI)
    
    // Step 7: Generate sharing components
    console.log('🔍 Step 7: Generating sharing components...')
    const baseUrl = window.location.origin
    const shareableUrl = `${baseUrl}/invite/${betId}`
    const qrCode = generateSimpleQRCode(betId.toString())
    console.log('✅ Sharing components generated')
    
    console.log('🎉 === SIMPLE BET CREATION SUCCESS ===')
    
    return {
      success: true,
      betId: betId.toString(),
      nftTokenId: nftTokenId.toString(),
      transactionHash,
      shareableUrl,
      qrCode
    }
    
  } catch (error) {
    console.error('❌ Simple bet creation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}