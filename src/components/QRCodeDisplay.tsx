import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  url: string
  size?: number
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url, size = 120 }) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataURL = await QRCode.toDataURL(url, {
          width: size,
          margin: 1,
          color: {
            dark: '#00ffff', // Cyan color to match theme
            light: '#000000' // Black background
          }
        })
        setQrCodeDataURL(dataURL)
      } catch (error) {
        console.error('Failed to generate QR code:', error)
      }
    }

    if (url) {
      generateQRCode()
    }
  }, [url, size])

  if (!qrCodeDataURL) {
    return (
      <div style={{
        width: size,
        height: size,
        background: '#000000',
        border: '1px solid #00ffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00ffff',
        fontSize: '0.8rem',
        fontFamily: 'Consolas, "Courier New", monospace'
      }}>
        Loading QR...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      <img
        src={qrCodeDataURL}
        alt="QR Code"
        style={{
          width: size,
          height: size,
          border: '1px solid #00ffff',
          borderRadius: '4px'
        }}
      />
      <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        fontFamily: 'Consolas, "Courier New", monospace',
        textAlign: 'center'
      }}>
        Scan to share bet
      </div>
    </div>
  )
}

export default QRCodeDisplay
