import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  url: string
  size?: number
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url, size = 200 }) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataURL = await QRCode.toDataURL(url, {
          width: size,
          margin: 2,
          color: {
            dark: '#ff0000', // Red QR code
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
        position: 'relative',
        width: size,
        height: size,
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff0000',
        fontSize: '0.8rem',
        fontFamily: 'Consolas, "Courier New", monospace',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <span style={{ zIndex: 2, position: 'relative' }}>Loading QR...</span>
        {/* Shine animation overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
          animation: 'qrShine 3s ease-in-out infinite',
          borderRadius: '8px',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      maxWidth: '300px'
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '8px',
          background: '#000000',
          overflow: 'hidden',
        }}>
          <img
            src={qrCodeDataURL}
            alt="QR Code"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              background: '#000000',
            }}
          />
          {/* Shine animation overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            animation: 'qrShine 3s ease-in-out infinite',
            borderRadius: '8px',
          }} />
        </div>
      </div>
    </div>
  )
}

export default QRCodeDisplay
