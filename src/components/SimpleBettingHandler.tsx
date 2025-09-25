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
        
        // Create a clean, consolidated success message
        const shortenedTxHash = result.transactionHash ? 
          `${result.transactionHash.slice(0, 6)}...${result.transactionHash.slice(-4)}` : 
          'N/A'
        
        const successMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          content: `✅ BET CREATED\n\n` +
            `📊 ${intent.amount} ${intent.currency} on ${intent.competitor}\n\n` +
            `🔗 TX: https://scan.test2.btcs.network/tx/${result.transactionHash}\n\n` +
            `🔗 Explorer: https://scan.test2.btcs.network/tx/${result.transactionHash}\n\n` +
            `📱 Share: ${result.shareableUrl}`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, successMessage])
        
        // Add separate QR code message
        if (result.shareableUrl) {
          const qrMessage: ChatMessage = {
            id: `ai_qr_${Date.now()}`,
            content: `📲 SCAN TO SHARE`,
            type: 'text',
            timestamp: new Date(),
            isUser: false,
            qrCodeUrl: result.shareableUrl
          }
          setMessages(prev => [...prev, qrMessage])
        }
        
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
