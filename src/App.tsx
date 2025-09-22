import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { blockchainService } from './services/blockchain';

// Import Views
import LandingView from './views/LandingView';
import MatchListView from './views/MatchListView';
import BetListView from './views/BetListView';
import MatchResolutionView from './views/MatchResolutionView';

// Import Components
import NavigationView from './components/NavigationView';

// Import Styles
import './styles/cyberpunk.css';

/**
 * ProtectedRoute Component
 * Ensures user is authenticated before accessing protected routes
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = blockchainService.getCurrentUser();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Main App Component
 * Sets up routing and global layout structure
 */
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App" style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        {/* Navigation - Hidden on landing page */}
        <NavigationView />
        
        {/* Main Content */}
        <main className="main-content">
          <Routes>
            {/* Landing Page - Public Route */}
            <Route path="/" element={<LandingView />} />
            
            {/* Protected Routes - Require Authentication */}
            <Route 
              path="/matches" 
              element={
                <ProtectedRoute>
                  <MatchListView />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/bets" 
              element={
                <ProtectedRoute>
                  <BetListView />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Route - Direct URL access only */}
            <Route 
              path="/resolve" 
              element={
                <ProtectedRoute>
                  <MatchResolutionView />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all Route - Redirect to appropriate page */}
            <Route 
              path="*" 
              element={
                <Navigate 
                  to={blockchainService.getCurrentUser() ? "/matches" : "/"} 
                  replace 
                />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;