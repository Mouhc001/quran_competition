import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import ScoringPage from './pages/ScoringPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminCandidates from './pages/admin/AdminCandidates';
import AdminJudges from './pages/admin/AdminJudges';
import CandidateForm from './pages/admin/CandidateForm';
import CandidateProfile from './pages/admin/CandidateProfile';
import JudgeForm from './pages/admin/JudgeForm';
import AdminRounds from './pages/admin/AdminRounds';
import RoundForm from './pages/admin/RoundForm';
import RoundDetails from './pages/admin/RoundDetails';
import CategoryCandidates from './pages/admin/CategoryCandidates';
import CandidateScores from './pages/admin/CandidateScores';
import CategoryScoresView from './pages/admin/scores/CategoryScoresView';
import CandidateScoreDetail from './pages/admin/CandidateScoreDetail';

// Créer une instance de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Composant pour protéger les routes admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const adminToken = localStorage.getItem('admin_token');
  
  if (!adminToken) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};

// Composant pour protéger les routes jury
const JudgeRoute = ({ children }: { children: React.ReactNode }) => {
  const judgeToken = localStorage.getItem('judge_token');
  
  if (!judgeToken) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen">
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Routes jury */}
            <Route path="/scoring" element={
              <JudgeRoute>
                <ScoringPage />
              </JudgeRoute>
            } />
            
            {/* Routes admin */}
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            <Route path="/admin/candidates" element={
              <AdminRoute>
                <AdminCandidates />
              </AdminRoute>
            } />
            
            <Route path="/admin/judges" element={
              <AdminRoute>
                <AdminJudges />
              </AdminRoute>
            } />
            
            <Route path="/admin/candidates/new" element={
              <AdminRoute>
                <CandidateForm />
              </AdminRoute>
            } />
            
            <Route path="/admin/candidates/:id" element={
              <AdminRoute>
                <CandidateProfile />
              </AdminRoute>
            } />
            
            <Route path="/admin/candidates/:id/edit" element={
              <AdminRoute>
                <CandidateForm />
              </AdminRoute>
            } />
            
            <Route path="/admin/judges/new" element={
              <AdminRoute>
                <JudgeForm />
              </AdminRoute>
            } />
            
            <Route path="/admin/judges/:id/edit" element={
              <AdminRoute>
                <JudgeForm />
              </AdminRoute>
            } />
            
            <Route path="/admin/rounds" element={
              <AdminRoute>
                <AdminRounds />
              </AdminRoute>
            } />
            
            <Route path="/admin/rounds/new" element={
              <AdminRoute>
                <RoundForm />
              </AdminRoute>
            } />
            
            <Route path="/admin/rounds/:id" element={
              <AdminRoute>
                <RoundDetails />
              </AdminRoute>
            } />
            
            <Route path="/admin/rounds/:id/edit" element={
              <AdminRoute>
                <RoundForm />
              </AdminRoute>
            } />
            
            <Route path="/admin/rounds/:id/categories/:categoryId" element={
              <AdminRoute>
                <CategoryCandidates />
              </AdminRoute>
            } />
            
            <Route path="/admin/rounds/:id/categories/:categoryId/scores" element={
              <AdminRoute>
                <CategoryScoresView />
              </AdminRoute>
            } />
            


            <Route path="/admin/candidates/:candidateId/scores/:roundId" element={
              <AdminRoute>
                <CandidateScoreDetail />
              </AdminRoute>
            } />


            
           {/* Redirection pour /admin */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;