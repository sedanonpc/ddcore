import React from 'react'
import { ChatMessage } from '../types'
import { parseSimpleBetIntent, createSimpleBet } from '../services/simpleBettingService'

/**
 * Simple Betting Handler - Direct blockchain integration
 * Bypasses all MCP complexity for reliable bet creation
 */

export interface SimpleBettingHandlerProps {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export function useSimpleBettingHandler({ setMessages, setIsLoading }: SimpleBettingHandlerProps) {
  
  const handleSimpleBetRequest = React.useCallback(async (message: string): Promise<void> => {
    console.log('🚀 === SIMPLE BETTING HANDLER START ===')
    console.log('📝 Message:', message)
    
    setIsLoading(true)
    
    try {
      // Step 1: Parse betting intent
      console.log('🔍 Step 1: Parsing betting intent...')
      const intent = parseSimpleBetIntent(message)
      
      if (!intent) {
        console.log('❌ Could not parse betting intent')
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          content: '❌ **COULD NOT PARSE BET REQUEST**\n\nPlease specify:\n- Amount (e.g., "10 USD" or "0.01 CORE")\n- Competitor (e.g., "Max Verstappen")\n- Sport (will be auto-detected)\n\nExample: "bet 10 USD on Max Verstappen"',
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, errorMessage])
        return
      }
      
      console.log('✅ Intent parsed:', intent)
      
      // Step 2: Create bet
      console.log('🔍 Step 2: Creating bet...')
      const result = await createSimpleBet(intent)
      console.log('📝 Bet creation result:', result)
      
      if (result.success) {
        console.log('✅ Bet created successfully!')
        
        // Success message
        const successMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          content: `✅ **BET CREATED SUCCESSFULLY!**\n\n🏆 **Bet ID:** ${result.betId}\n💎 **NFT Token ID:** ${result.nftTokenId}`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, successMessage])
        
        // Transaction details
        if (result.transactionHash) {
          const txMessage: ChatMessage = {
            id: `ai_tx_${Date.now()}`,
            content: `🔗 **TRANSACTION CONFIRMED ON-CHAIN**\n\n📋 **Transaction ID:** ${result.transactionHash}\n\n🔍 **View on Core Explorer:**\nhttps://scan.test2.btcs.network/tx/${result.transactionHash}\n\n✨ Your bet is now permanently recorded on the blockchain!`,
            type: 'text',
            timestamp: new Date(),
            isUser: false
          }
          setMessages(prev => [...prev, txMessage])
        }
        
        // Sharing info
        if (result.shareableUrl) {
          const shareMessage: ChatMessage = {
            id: `ai_share_${Date.now()}`,
            content: `🎯 **BET ACCEPTANCE PAGE**\n\n📱 **Share this link with friends to accept your bet:**\n\n${result.shareableUrl}\n\n📲 **QR Code:** Available for easy sharing\n\n🎲 Once someone accepts, the bet will be locked and ready for resolution!`,
            type: 'text',
            timestamp: new Date(),
            isUser: false
          }
          setMessages(prev => [...prev, shareMessage])
        }
        
        // Next steps
        const instructionsMessage: ChatMessage = {
          id: `ai_instructions_${Date.now()}`,
          content: `🎮 **WHAT HAPPENS NEXT?**\n\n1️⃣ Share the bet link with friends\n2️⃣ Wait for someone to accept the challenge\n3️⃣ Watch the match/game\n4️⃣ Bet resolves automatically based on results\n\n💰 Winner takes the full pot! Good luck! 🍀`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, instructionsMessage])
        
      } else {
        console.log('❌ Bet creation failed:', result.error)
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          content: `❌ **BET CREATION FAILED**\n\n${result.error}\n\n🔧 **Debug Info:**\n- Intent: ${JSON.stringify(intent)}\n- Error: ${result.error}`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, errorMessage])
      }
      
    } catch (error) {
      console.error('❌ Simple betting handler failed:', error)
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: `❌ **CRITICAL ERROR**\n\n${error instanceof Error ? error.message : String(error)}\n\n🔧 **Debug Info:**\n- Message: ${message}\n- Error: ${error instanceof Error ? error.stack : 'No stack trace'}`,
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      console.log('🏁 === SIMPLE BETTING HANDLER END ===')
      setIsLoading(false)
    }
  }, [setMessages, setIsLoading])
  
  return { handleSimpleBetRequest }
}
