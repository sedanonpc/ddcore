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
            dark: '#ffffff', // White QR code
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
        border: '3px solid #ff0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '0.8rem',
        fontFamily: 'Consolas, "Courier New", monospace',
        borderRadius: '8px',
        animation: 'pulse 2s infinite'
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
        <img
          src={qrCodeDataURL}
          alt="QR Code"
          style={{
            width: size,
            height: size,
            border: '3px solid #ff0000',
            borderRadius: '8px',
            background: '#000000',
            animation: 'pulse 2s infinite'
          }}
        />
      </div>
    </div>
  )
}

export default QRCodeDisplay
