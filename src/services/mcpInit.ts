import { mcpService } from './mcpService'

/**
 * Initialize MCP Service for browser environment
 * This sets up the MCP-compatible service that works in React
 */
export async function initializeMCP(): Promise<void> {
  try {
    console.log('🚀 Initializing MCP Service...')
    await mcpService.initialize()
    console.log('✅ MCP Service initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize MCP Service:', error)
    // Don't throw - allow app to continue without MCP
  }
}

/**
 * Test MCP functionality
 */
export async function testMCPIntegration(): Promise<void> {
  try {
    console.log('🧪 Testing MCP integration...')
    
    // Test getting available matches
    const matches = await mcpService.getAvailableMatches('f1', 5)
    console.log('📋 Available matches:', matches)
    
    // Test getting guided betting prompt
    const prompt = await mcpService.getGuidedBettingPrompt()
    console.log('💬 Guided betting prompt:', prompt)
    
    // Test parsing betting intent
    const intent = await mcpService.parseBettingIntent('bet 50 CORE on max verstappen')
    console.log('🎯 Parsed betting intent:', intent)
    
    console.log('✅ MCP integration test completed successfully')
    
  } catch (error) {
    console.error('❌ MCP integration test failed:', error)
  }
}