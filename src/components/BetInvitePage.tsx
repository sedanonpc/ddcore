import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DatabaseBet } from '../types'
import { matchDataService } from '../utils/matchData'
import { blockchainService } from '../services/blockchain'
import { supabaseService } from '../services/supabase'
import BetAcceptanceView from './BetAcceptanceView'
import '../styles/cyberpunk.css'

interface BetInvitePageProps {
  betId: string
  onClose?: () => void
}

/**
 * BetInvitePage Component
 * Mobile-optimized page for accepting bets via QR code
 * Features social sharing and streamlined acceptance flow
 */
const BetInvitePage: React.FC<BetInvitePageProps> = ({ betId, onClose }) => {
  const [bet, setBet] = useState<DatabaseBet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAcceptanceView, setShowAcceptanceView] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string>('')

  // Load bet data on component mount
  useEffect(() => {
    loadBetData()
    generateShareData()
  }, [betId])

  /**
   * Load bet data from database
   */
  const loadBetData = async () => {
    try {
      setLoading(true)
      const betData = await supabaseService.getBet(betId)

      if (!betData) {
        throw new Error('Bet not found')
      }

      if (betData.status !== 'open') {
        throw new Error('This bet is no longer available for acceptance')
      }

      setBet(betData)
    } catch (err: any) {
      console.error('Failed to load bet:', err)
      setError(err.message || 'Failed to load bet information')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Generate QR code and share data
   */
  const generateShareData = () => {
    const baseUrl = window.location.origin
    const inviteUrl = `${baseUrl}/invite/${betId}`
    setShareUrl(inviteUrl)

    // Generate QR code (using a QR code service or library)
    // For now, we'll use a placeholder - in production, use a proper QR library
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteUrl)}`)
  }

  /**
   * Handle social sharing
   */
  const handleShare = async (platform: 'twitter' | 'whatsapp' | 'copy') => {
    if (!bet) return

    const { data } = bet
    const { match, bet: betInfo } = data
    const creatorCompetitor = data.matchCompetitors[betInfo.creator.selectedCompetitorID]

    const betAmount = betInfo.amount?.value || 'TBD'
    const currency = betInfo.amount?.currency || 'CORE'
    const creatorName = betInfo.creator.username

    let shareText = ''
    let shareUrl = ''

    switch (platform) {
      case 'twitter':
        shareText = `🔥 DARE ACCEPTED! ${betAmount} ${currency} on ${creatorCompetitor?.name || 'Unknown'} vs ${betInfo.acceptor?.selectedCompetitorID || 'Opponent'} in ${match.title}! Who wins? 🤔 #DareDevil #SportsBetting`
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
        break

      case 'whatsapp':
        shareText = `🔥 Sports Betting Challenge! ${betAmount} ${currency} bet on ${match.title}. Think you can beat me? Tap to accept! 💰`
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + window.location.href)}`
        break

      case 'copy':
        await navigator.clipboard.writeText(window.location.href)
        // Could show a toast notification here
        return
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
  }

  /**
   * Handle bet acceptance
   */
  const handleAcceptBet = async () => {
    setShowAcceptanceView(true)
  }

  /**
   * Handle successful bet acceptance
   */
  const handleBetAccepted = () => {
    setShowAcceptanceView(false)
    // Could navigate to bet details or show success message
    if (onClose) onClose()
  }

  // Loading state
  if (loading) {
    return (
      <div className="bet-invite-page" style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            width: '60px',
            height: '60px',
            border: '4px solid var(--accent-red)',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            marginBottom: '20px'
          }}
        />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
          Loading Bet Details...
        </h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
          Fetching the latest bet information
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bet-invite-page" style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--accent-red)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px' }}>
            ⚠️ Bet Unavailable
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {error}
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'var(--accent-red)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Show acceptance view if bet is being accepted
  if (showAcceptanceView && bet) {
    return (
      <BetAcceptanceView
        bet={bet}
        onClose={() => setShowAcceptanceView(false)}
        onBetAccepted={handleBetAccepted}
      />
    )
  }

  // Main invite page
  if (bet) {
    const { data } = bet
    const { match, bet: betInfo } = data
    const creatorCompetitor = data.matchCompetitors[betInfo.creator.selectedCompetitorID]

    return (
      <div className="bet-invite-page" style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        padding: '20px'
      }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <h1 style={{
            color: 'var(--accent-red)',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '10px',
            textShadow: '0 0 20px rgba(220, 38, 38, 0.5)'
          }}>
            🔥 DARE ACCEPTED! 🔥
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            You've been challenged to a bet
          </p>
        </motion.div>

        {/* QR Code Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px'
          }}
        >
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-red)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(220, 38, 38, 0.3)'
          }}>
            <img
              src={qrCodeUrl}
              alt="Bet QR Code"
              style={{
                width: '200px',
                height: '200px',
                borderRadius: '12px'
              }}
            />
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              textAlign: 'center',
              marginTop: '16px'
            }}>
              Scan with phone to accept
            </p>
          </div>
        </motion.div>

        {/* Bet Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-accent)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            maxWidth: '500px',
            margin: '0 auto 30px auto'
          }}
        >
          {/* Match Info */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-accent)', marginBottom: '12px' }}>
              {match.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {match.subtitle}
            </p>
          </div>

          {/* Bet Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Creator's Pick */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', marginBottom: '8px' }}>
                CHALLENGER
              </div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {betInfo.creator.username}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {creatorCompetitor?.abbreviation || 'TBD'}
              </div>
            </div>

            {/* Bet Amount */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginBottom: '8px' }}>
                STAKES
              </div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.25rem' }}>
                {betInfo.amount?.value || 'TBD'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {betInfo.amount?.currency || 'CORE'}
              </div>
            </div>
          </div>

          {/* VS Display */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            padding: '16px',
            background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))',
            borderRadius: '12px',
            border: '2px solid var(--accent-red)'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'var(--accent-red)',
              marginBottom: '8px'
            }}>
              VS
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Winner takes all!
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '300px',
            margin: '0 auto'
          }}
        >
          {/* Accept Bet Button */}
          <button
            onClick={handleAcceptBet}
            style={{
              background: 'linear-gradient(135deg, var(--accent-red), #b91c1c)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(220, 38, 38, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(220, 38, 38, 0.6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)'
            }}
          >
            🎯 ACCEPT THE CHALLENGE
          </button>

          {/* Share Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => handleShare('twitter')}
              style={{
                background: '#1da1f2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
              title="Share on Twitter"
            >
              🐦
            </button>
            <button
              onClick={() => handleShare('whatsapp')}
              style={{
                background: '#25d366',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
              title="Share on WhatsApp"
            >
              💬
            </button>
            <button
              onClick={() => handleShare('copy')}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
              title="Copy Link"
            >
              📋
            </button>
          </div>

          {/* Back Button */}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              ← Back to App
            </button>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            textAlign: 'center',
            marginTop: '40px',
            color: 'var(--text-muted)',
            fontSize: '0.875rem'
          }}
        >
          <p>Powered by DAREDEVIL - The Future of Sports Betting</p>
          <p style={{ marginTop: '8px', fontSize: '0.75rem' }}>
            Gamble responsibly • 21+ only
          </p>
        </motion.div>
      </div>
    )
  }

  return null
}

export default BetInvitePage
