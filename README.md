# Daredevil - Web3 Sports Betting App

A decentralized sports betting application built for hackathon demonstration, featuring NFT-based bet certificates and blockchain-powered escrow on Core Testnet2.

## 🚀 Features

- **Web3 Authentication**: MetaMask wallet integration
- **NFT Bet Certificates**: Each bet mints an ERC-721 NFT as proof of participation
- **Multi-Sport Support**: NBA, F1, FIFA World Cup, and WWE matches
- **Smart Contract Escrow**: Secure fund management on Core Blockchain
- **Cyberpunk UI**: Futuristic blue-themed responsive design
- **Real-time Updates**: Supabase integration for bet management

## 🏗️ Architecture

### Smart Contracts
- **SportsBetting.sol**: Main betting contract handling escrow and resolution
- **SportsBettingNFT.sol**: ERC-721 contract for bet participation certificates
- **Network**: Core Testnet2 (Chain ID: 1114)

### Frontend
- **React + TypeScript**: Modern web application
- **ethers.js**: Blockchain interaction library
- **React Router**: Client-side routing
- **Responsive Design**: Mobile-first cyberpunk theme

### Backend Services
- **Supabase**: PostgreSQL database and metadata storage
- **Core RPC**: Blockchain connectivity

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- MetaMask browser extension
- Core Testnet2 tCORE2 tokens for testing

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd sports-betting-app
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://dbifatzrqxsbgrnqelck.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Core Blockchain Configuration
REACT_APP_CORE_RPC_URL=https://rpc.test2.btcs.network
REACT_APP_CORE_CHAIN_ID=1114
REACT_APP_CORE_CHAIN_NAME=Core Blockchain TestNet2
REACT_APP_CORE_NATIVE_CURRENCY_NAME=tCORE2
REACT_APP_CORE_NATIVE_CURRENCY_SYMBOL=tCORE2
REACT_APP_CORE_NATIVE_CURRENCY_DECIMALS=18
REACT_APP_CORE_BLOCK_EXPLORER=https://scan.test2.btcs.network

# Smart Contract Addresses (fill after deployment)
REACT_APP_BETTING_CONTRACT_ADDRESS=
REACT_APP_NFT_CONTRACT_ADDRESS=

# App Configuration
REACT_APP_MARKETING_NAME=Daredevil
REACT_APP_DEFAULT_CURRENCY=CORE
```

### 3. Smart Contract Deployment

#### Compile Contracts
```bash
npm run compile
```

#### Deploy to Core Testnet2
1. Add your private key to `hardhat.config.ts`
2. Ensure you have tCORE2 tokens for gas fees
3. Deploy contracts:
```bash
npm run deploy
```

4. Update `.env` file with deployed contract addresses from the output

### 4. Supabase Database Setup

Create a table named `bets` with the following schema:

```sql
CREATE TABLE bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'accepted', 'resolved')),
  created_date_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  last_updated_date_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  creator_username TEXT NOT NULL,
  acceptor_username TEXT,
  data JSONB NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_match_id ON bets(match_id);
CREATE INDEX idx_bets_creator ON bets(creator_username);
CREATE INDEX idx_bets_acceptor ON bets(acceptor_username);
```

Create a storage bucket named `metadata` for NFT metadata files.

### 5. Start Development Server
```bash
npm start
```

The app will be available at `http://localhost:3000`

## 📱 Usage

### For Users
1. **Connect Wallet**: Click "Login with MetaMask" on the landing page
2. **Browse Matches**: View available sports matches
3. **Create Bets**: Select a match and create your prediction
4. **Accept Bets**: Browse open bets and challenge other players
5. **Track Results**: Monitor your bets and winnings

### For Admins
1. **Access Admin Panel**: Navigate to `/resolve` (direct URL only)
2. **Select Match**: Choose a completed match
3. **Set Winner**: Select the winning competitor
4. **Resolve Bets**: Execute blockchain transactions to distribute winnings

## 🎮 Supported Sports

### Standard 1v1 Format
- **NBA**: Team vs Team
- **FIFA World Cup**: Country vs Country  
- **WWE**: Wrestler vs Wrestler

### F1 Special Format
- **Formula 1**: Racer ranking predictions (who will finish higher)

## 🔧 Development Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Compile smart contracts
npm run compile

# Deploy contracts to Core Testnet2
npm run deploy

# Deploy contracts locally (for testing)
npm run deploy:local
```

## 🏛️ Smart Contract Functions

### SportsBetting Contract
- `createBet()`: Create new bet with escrow deposit
- `acceptBet()`: Accept existing bet with matching deposit
- `resolveBet()`: Resolve bet and distribute winnings (admin only)
- `getBet()`: Retrieve bet information
- `getUserBets()`: Get user's bet history

### SportsBettingNFT Contract
- `mintBetNFT()`: Mint NFT certificate for bet participation
- `setTokenURI()`: Update NFT metadata (admin only)
- `tokenURI()`: Get NFT metadata URL

## 🎨 UI Theme

The application features a cyberpunk aesthetic with:
- **Primary Colors**: Electric blue (#0066ff) and cyan (#00d2ff)
- **Background**: Dark navy and black gradients
- **Accents**: Neon highlights and glow effects
- **Typography**: Modern sans-serif with monospace code elements
- **Animations**: Smooth transitions and hover effects

## 🔐 Security Considerations

⚠️ **Hackathon Build Notice**: This application is built for demonstration purposes with certain security compromises:

- Admin functions accessible via direct URL
- Simplified error handling
- No sophisticated retry logic
- Basic input validation

For production use, implement:
- Proper admin authentication
- Comprehensive error handling
- Rate limiting and input sanitization
- Multi-signature admin functions
- Formal security audits

## 📄 License

This project is built for hackathon demonstration purposes.

## 🤝 Contributing

This is a hackathon project. For production development:
1. Fork the repository
2. Create feature branches
3. Add comprehensive tests
4. Submit pull requests with detailed descriptions

## 📞 Support

For technical issues or questions:
1. Check the browser console for error messages
2. Verify MetaMask connection and network settings
3. Ensure sufficient tCORE2 balance for transactions
4. Confirm contract addresses in environment variables

---

**Built with ❤️ for the Web3 community**