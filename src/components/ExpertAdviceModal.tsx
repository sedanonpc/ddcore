import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/cyberpunk.css'

interface ExpertAdviceData {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  advice: string[]
  warnings: string[]
  suggestions: string[]
  educationalContent: {
    title: string
    content: string
    source: string
  }[]
}

interface ExpertAdviceModalProps {
  isOpen: boolean
  onClose: () => void
  context: {
    betAmount: number
    betType: 'single' | 'parlay' | 'prop'
    sport: string
    userHistory?: {
      totalBets: number
      winRate: number
      avgBetSize: number
    }
  }
}

/**
 * ExpertAdviceModal Component
 * Provides contextual expert advice on sports betting and prediction markets
 * Includes risk assessment, educational content, and responsible gambling guidance
 */
const ExpertAdviceModal: React.FC<ExpertAdviceModalProps> = ({
  isOpen,
  onClose,
  context
}) => {
  const [activeTab, setActiveTab] = useState<'advice' | 'education' | 'tools'>('advice')

  // Generate contextual advice based on bet context
  const generateExpertAdvice = (): ExpertAdviceData => {
    const { betAmount, betType, userHistory } = context

    // Risk assessment based on bet size and history
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low'
    if (betAmount > 1000) riskLevel = 'high'
    if (betAmount > 5000) riskLevel = 'extreme'
    if (userHistory && userHistory.totalBets < 10) riskLevel = 'medium'

    // Base advice
    const baseAdvice = [
      "Sports betting involves substantial risk of loss and is not suitable for every investor.",
      "Never bet more than you can afford to lose.",
      "Consider your overall financial situation before placing any bets."
    ]

    // Context-specific advice
    const contextualAdvice = []
    if (betType === 'parlay') {
      contextualAdvice.push(
        "Parlay bets offer high rewards but have significantly lower probability of winning.",
        "Consider breaking large parlays into individual bets for better risk management."
      )
    }

    if (betAmount > (userHistory?.avgBetSize || 100) * 3) {
      contextualAdvice.push(
        "This bet size is significantly larger than your average. Consider if this aligns with your risk tolerance.",
        "Large bet sizing can lead to emotional decision-making. Stick to predetermined amounts."
      )
    }

    if (userHistory && userHistory.totalBets < 5) {
      contextualAdvice.push(
        "As a newer bettor, start with smaller amounts to learn market dynamics.",
        "Focus on understanding the sport and teams rather than chasing large wins."
      )
    }

    // Warnings based on risk level
    const warnings = []
    if (riskLevel === 'high' || riskLevel === 'extreme') {
      warnings.push(
        "⚠️ HIGH RISK: This bet represents a significant portion of potential losses.",
        "⚠️ Consider the impact of losing this amount on your financial well-being.",
        "⚠️ Market conditions can change rapidly - ensure you have an exit strategy."
      )
    }

    if (betType === 'parlay') {
      warnings.push(
        "⚠️ Parlays have historically low success rates - treat them as entertainment rather than investment."
      )
    }

    // Suggestions
    const suggestions = [
      "Set a strict betting budget and never exceed it",
      "Keep detailed records of all your bets for analysis",
      "Take regular breaks from betting to maintain perspective",
      "Consider diversifying across different sports and bet types"
    ]

    // Educational content
    const educationalContent = [
      {
        title: "Bankroll Management",
        content: "Effective bankroll management is crucial for long-term success. Never risk more than 1-2% of your total bankroll on a single bet. This approach helps you survive losing streaks and capitalize on winning streaks.",
        source: "Professional Sports Betting Handbook"
      },
      {
        title: "Understanding Variance",
        content: "Sports betting involves significant variance. Even skilled bettors experience losing streaks. Focus on process over results and maintain discipline during difficult periods.",
        source: "Statistical Analysis of Sports Markets"
      },
      {
        title: "Market Psychology",
        content: "Market prices reflect collective wisdom and often represent the most efficient assessment available. Significant deviations usually indicate valuable opportunities or increased risk.",
        source: "Behavioral Finance in Prediction Markets"
      }
    ]

    return {
      riskLevel,
      advice: [...baseAdvice, ...contextualAdvice],
      warnings,
      suggestions,
      educationalContent
    }
  }

  const adviceData = generateExpertAdvice()

  // Risk level colors
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'var(--accent-green)'
      case 'medium': return '#f59e0b' // amber
      case 'high': return 'var(--accent-red)'
      case 'extreme': return '#dc2626' // red
      default: return 'var(--accent-cyan)'
    }
  }

  const getRiskEmoji = (level: string) => {
    switch (level) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'extreme': return '🔴'
      default: return '🔵'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: '800px',
              maxHeight: '90vh',
              background: 'var(--bg-card)',
              border: '2px solid var(--accent-red)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 25px rgba(220, 38, 38, 0.3)',
              zIndex: 9999,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))',
              borderBottom: '1px solid var(--accent-red)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--accent-red)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  🧠
                </div>
                <div>
                  <h2 style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    margin: 0
                  }}>
                    Expert Betting Analysis
                  </h2>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    AI-powered risk assessment and guidance
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ✕
              </button>
            </div>

            {/* Risk Level Indicator */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-primary)',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>{getRiskEmoji(adviceData.riskLevel)}</span>
              <div>
                <div style={{
                  color: getRiskColor(adviceData.riskLevel),
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}>
                  Risk Level: {adviceData.riskLevel.toUpperCase()}
                </div>
                <div style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem'
                }}>
                  Assessment based on bet size, type, and your history
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '60vh' }}>
              {/* Tab Navigation */}
              <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '24px',
                borderBottom: '1px solid var(--border-primary)'
              }}>
                {[
                  { id: 'advice', label: '💡 Expert Advice', icon: '💡' },
                  { id: 'education', label: '📚 Learn', icon: '📚' },
                  { id: 'tools', label: '🛠️ Tools', icon: '🛠️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      background: activeTab === tab.id ? 'var(--accent-red)' : 'transparent',
                      color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '8px 8px 0 0',
                      padding: '12px 20px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'advice' && (
                  <motion.div
                    key="advice"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* Key Advice */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{
                        color: 'var(--accent-cyan)',
                        fontSize: '1.1rem',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>🎯</span>
                        Key Recommendations
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {adviceData.advice.map((item, index) => (
                          <div key={index} style={{
                            background: 'var(--bg-secondary)',
                            borderLeft: `4px solid ${getRiskColor(adviceData.riskLevel)}`,
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)'
                          }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Warnings */}
                    {adviceData.warnings.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{
                          color: 'var(--accent-red)',
                          fontSize: '1.1rem',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>⚠️</span>
                          Important Warnings
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {adviceData.warnings.map((warning, index) => (
                            <div key={index} style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid var(--accent-red)',
                              padding: '12px 16px',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              color: 'var(--accent-red)'
                            }}>
                              {warning}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    <div>
                      <h3 style={{
                        color: 'var(--accent-green)',
                        fontSize: '1.1rem',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>💡</span>
                        Actionable Suggestions
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {adviceData.suggestions.map((suggestion, index) => (
                          <div key={index} style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid var(--accent-green)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            color: 'var(--accent-green)'
                          }}>
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'education' && (
                  <motion.div
                    key="education"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {adviceData.educationalContent.map((item, index) => (
                        <div key={index} style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: '12px',
                          padding: '20px',
                          border: '1px solid var(--border-primary)'
                        }}>
                          <h4 style={{
                            color: 'var(--accent-cyan)',
                            fontSize: '1rem',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>📖</span>
                            {item.title}
                          </h4>
                          <p style={{
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            marginBottom: '12px'
                          }}>
                            {item.content}
                          </p>
                          <div style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontStyle: 'italic'
                          }}>
                            Source: {item.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'tools' && (
                  <motion.div
                    key="tools"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* Bankroll Calculator */}
                      <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid var(--border-accent)'
                      }}>
                        <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                          🧮 Bankroll Calculator
                        </h4>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                          <p>Recommended bet size: <strong style={{ color: 'var(--accent-green)' }}>
                            ${(context.betAmount * 0.02).toFixed(2)}
                          </strong></p>
                          <p>Based on 2% of bet amount as maximum risk per trade</p>
                        </div>
                      </div>

                      {/* Risk Assessment */}
                      <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid var(--border-accent)'
                      }}>
                        <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                          📊 Risk Assessment
                        </h4>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                          <p>Current risk level: <strong style={{ color: getRiskColor(adviceData.riskLevel) }}>
                            {adviceData.riskLevel.toUpperCase()}
                          </strong></p>
                          <p>Consider reducing exposure if uncomfortable with current risk</p>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid var(--border-accent)'
                      }}>
                        <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                          ⚡ Quick Actions
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid var(--accent-green)',
                            color: 'var(--accent-green)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}>
                            💾 Save as Preset
                          </button>
                          <button style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid var(--accent-cyan)',
                            color: 'var(--accent-cyan)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}>
                            📤 Export Analysis
                          </button>
                        </div>
                      </div>

                      {/* Resources */}
                      <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid var(--border-accent)'
                      }}>
                        <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                          📚 Resources
                        </h4>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                          <p>• <span style={{ color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline' }}>Responsible Gambling Guide</span></p>
                          <p>• <span style={{ color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline' }}>Risk Management 101</span></p>
                          <p>• <span style={{ color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline' }}>Market Psychology</span></p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-primary)',
              padding: '16px 24px',
              textAlign: 'center'
            }}>
              <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                margin: 0
              }}>
                This advice is for educational purposes only. Always gamble responsibly.
              </p>
              <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                margin: '8px 0 0 0'
              }}>
                If you need help, contact: <a href="#" style={{ color: 'var(--accent-cyan)' }}>Problem Gambling Helpline</a>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ExpertAdviceModal
