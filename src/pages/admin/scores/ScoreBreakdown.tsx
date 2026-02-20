// src/components/scores/ScoreBreakdown.tsx
import React from 'react';
import { Award, CheckCircle, XCircle, Star } from 'lucide-react';

interface ScoreBreakdownProps {
  scores: any[];
  showComments?: boolean;
}

const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ scores, showComments = false }) => {
  // Implémentation similaire à renderCandidateDetails dans CategoryScoresView
  // À extraire pour réutiliser dans plusieurs pages
  return (
    <div>...</div>
  );
};

export default ScoreBreakdown;