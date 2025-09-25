import React from 'react'
import { ChatMessage } from '../types'
import { parseSimpleBetIntent, createSimpleBet, SimpleBetIntent } from '../services/simpleBettingService'
import { llmService } from '../services/llmService'

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
      // Step 1: Parse betting intent using LLM first, then fallback to regex
      console.log('🔍 Step 1: Parsing betting intent with LLM...')
      let intent: SimpleBetIntent | null = null
      
      try {
        const llmResponse = await llmService.parseBettingIntent(message)
        if (llmResponse.success && llmResponse.data) {
          const parsedIntent = llmService.parseJSONResponse(llmResponse.data)
          console.log('✅ LLM parsed intent:', parsedIntent)
          
          // Convert LLM response to SimpleBetIntent format
          if (parsedIntent.amount && parsedIntent.competitor && parsedIntent.sport) {
            intent = {
              amount: parsedIntent.amount,
              currency: parsedIntent.currency || 'CORE',
              competitor: parsedIntent.competitor,
              sport: parsedIntent.sport
            }
            console.log('✅ LLM intent conversion successful:', intent)
          }
        }
      } catch (llmError) {
        console.warn('⚠️ LLM parsing failed, falling back to regex:', llmError)
      }
      
      // Fallback to regex parsing if LLM failed
      if (!intent) {
        console.log('🔍 Step 1b: Falling back to regex parsing...')
        intent = parseSimpleBetIntent(message)
      }
      
      if (!intent) {
        console.log('❌ Could not parse betting intent')
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          content: '❌ **PARSE ERROR**\n\nSpecify: Amount + Competitor\n\nExample: "bet 10 USD on Max Verstappen"',
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, errorMessage])
        return
      }
      
      console.log('✅ Final parsed intent:', intent)
      
      // Add progress message
      const progressMessage: ChatMessage = {
        id: `progress_${Date.now()}`,
        content: `🔄 **PROCESSING**\n\n` +
          `💰 ${intent.amount} ${intent.currency} on ${intent.competitor}\n` +
          `⏳ Creating transaction...`,
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, progressMessage])
      
      // Step 2: Create bet
      console.log('🔍 Step 2: Creating bet...')
      
      // Add timeout to prevent hanging
      const betCreationPromise = createSimpleBet(intent)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Bet creation timed out after 60 seconds')), 60000)
      )
      
      const result = await Promise.race([betCreationPromise, timeoutPromise]) as any
      console.log('📝 Bet creation result:', result)
      console.log('📝 Result type:', typeof result)
      console.log('📝 Result success:', result?.success)
      console.log('📝 Result error:', result?.error)
      
      if (result.success) {
        console.log('✅ Bet created successfully!')
        console.log('📝 Full result object:', JSON.stringify(result, null, 2))
        
        // Create a clean, consolidated success message
        const shortenedTxHash = result.transactionHash ? 
          `${result.transactionHash.slice(0, 6)}...${result.transactionHash.slice(-4)}` : 
          'N/A'
        
        console.log('🔍 Creating success message...')
        const successMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          content: `✅ **BET CREATED**\n\n` +
            `💰 ${intent.amount} ${intent.currency} on ${intent.competitor} (${intent.sport})\n` +
            `🔗 TX: ${result.transactionHash}\n` +
            `🌐 Explorer: https://scan.test2.btcs.network/tx/${result.transactionHash}\n` +
            `📱 Share: ${result.shareableUrl}`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        console.log('🔍 Adding success message to chat...')
        setMessages(prev => [...prev, successMessage])
        
        // Add separate QR code message
        if (result.shareableUrl) {
          console.log('🔍 Creating QR code message...')
          const qrMessage: ChatMessage = {
            id: `ai_qr_${Date.now()}`,
            content: `📱 **QR CODE**\n\n` +
              `💰 ${intent.amount} ${intent.currency} on ${intent.competitor}\n\n` +
              `😈 $DARED!`,
            type: 'text',
            timestamp: new Date(),
            isUser: false,
            qrCodeUrl: result.shareableUrl
          }
        console.log('🔍 Adding QR message to chat...')
        setMessages(prev => [...prev, qrMessage])
      } else {
        console.log('⚠️ No shareable URL found in result')
      }
      
      // Add final success message
      console.log('🔍 Adding final success message...')
      const finalMessage: ChatMessage = {
        id: `final_${Date.now()}`,
        content: `✅ **COMPLETE**\n\n` +
          `🔗 TX Confirmed\n` +
          `📱 QR Generated\n\n` +
          `🎯 Share → Wait → Watch → Win`,
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, finalMessage])
        
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
