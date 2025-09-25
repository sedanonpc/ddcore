// Emergency debugging patch for executeAutonomousBet
// This will help us identify where the function is failing

const debugExecuteAutonomousBet = `
  const executeAutonomousBet = React.useCallback(async (intent: BettingIntent): Promise<void> => {
    console.log('🚀 === EXECUTE AUTONOMOUS BET START ===')
    console.log('📝 Intent:', intent)
    console.log('📝 Betting Context:', bettingContext)
    
    if (!bettingContext) {
      console.log('❌ No betting context - returning early')
      const errorMessage: ChatMessage = {
        id: \`error_\${Date.now()}\`,
        content: '❌ **CRITICAL ERROR:** No betting context available. Please try again.',
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }

    setIsLoading(true)

    try {
      console.log('🔍 Step 1: Generating expert advice...')
      // Generate expert advice first
      const expertAdvice = await mcpService.generateExpertAdvice(bettingContext)
      console.log('✅ Expert advice generated:', expertAdvice)

      // Show expert advice modal if risk is high
      if (expertAdvice.riskLevel === 'high' || expertAdvice.riskLevel === 'extreme') {
        console.log('⚠️ High risk detected, showing expert advice modal')
        setShowExpertAdvice(true)
        return
      }

      console.log('🔍 Step 2: Creating autonomous match...')
      // Create autonomous match if needed
      let match = bettingContext.matches[0]
      if (!match) {
        const matchCriteria = {
          sport: intent.sport,
          teams: [intent.competitor]
        }
        console.log('📝 Match criteria:', matchCriteria)
        match = await mcpService.createAutonomousMatch(matchCriteria)
        console.log('✅ Match created:', match)
      } else {
        console.log('✅ Using existing match:', match)
      }

      console.log('🔍 Step 3: Creating autonomous bet...')
      // Create bet autonomously
      const mcpResponse = await mcpService.createAutonomousBet(intent, match)
      console.log('📝 MCP Response:', mcpResponse)

      if (mcpResponse.success) {
        console.log('✅ Bet created successfully!')
        // ... existing success handling code ...
      } else {
        console.log('❌ MCP Response failed:', mcpResponse.message)
        const errorMessage: ChatMessage = {
          id: \`error_\${Date.now()}\`,
          content: \`❌ **BET CREATION FAILED**\n\n\${mcpResponse.message || 'Unknown error occurred'}\n\n🔧 **Debug Info:**\n- Intent: \${JSON.stringify(intent)}\n- Match: \${JSON.stringify(match)}\n- MCP Response: \${JSON.stringify(mcpResponse)}\`,
          type: 'text',
          timestamp: new Date(),
          isUser: false
        }
        setMessages(prev => [...prev, errorMessage])
      }

    } catch (error) {
      console.error('❌ Failed to execute autonomous bet:', error)
      const errorMessage: ChatMessage = {
        id: \`error_\${Date.now()}\`,
        content: \`❌ **CRITICAL ERROR IN BET CREATION**\n\n\${error instanceof Error ? error.message : String(error)}\n\n🔧 **Debug Info:**\n- Intent: \${JSON.stringify(intent)}\n- Betting Context: \${JSON.stringify(bettingContext)}\n- Error Stack: \${error instanceof Error ? error.stack : 'No stack trace'}\`,
        type: 'text',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      console.log('🏁 === EXECUTE AUTONOMOUS BET END ===')
      setIsLoading(false)
    }
  }, [bettingContext])
`;

console.log('Debug patch created. Apply this to executeAutonomousBet function.');
