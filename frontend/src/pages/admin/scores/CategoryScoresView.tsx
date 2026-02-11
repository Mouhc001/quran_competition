// src/pages/admin/scores/CategoryScoresView.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../../api/service';
import {
  ArrowLeft, BarChart, User, Award, FileText, ChevronRight,
  CheckCircle, XCircle, Star, Users, Target, TrendingUp,
  Shield, Filter, Download, Eye, EyeOff, Grid, List
} from 'lucide-react';

// Types
interface JudgeScore {
  judge_id: string;
  judge_name: string;
  judge_total: number;
  questions: Array<{
    question_number: number;
    recitation_score: number;
    siffat_score: number;
    makharij_score: number;
    minor_error_score: number;
    question_total: number;
    comment: string;
  }>;
}

interface CandidateScore {
  candidate_id: string;
  candidate_name: string;
  registration_number: string;
  category: string;
  judges_count: number;
  total_score: number; // Sur 30 points
  average_per_question: number; // Sur 6 points
  judges_details: JudgeScore[];
}

interface ScoreStatistics {
  candidates_count: number;
  average_total: number;
  lowest_score: number;
  highest_score: number;
  standard_deviation: number;
  excellent_count: number;
  good_count: number;
  average_count: number;
  poor_count: number;
}

// Fonction utilitaire pour parser les valeurs numériques
const parseScoreValue = (value: any): number => {
  console.log('parseScoreValue reçoit:', value, 'type:', typeof value);
  
  if (value === null || value === undefined) {
    return 0;
  }
  
  // SI C'EST DÉJÀ UN NOMBRE
  if (typeof value === 'number') {
    return value;
  }
  
  // SI C'EST UNE CHAÎNE
  if (typeof value === 'string') {
    // Vérifie si c'est une chaîne vide
    if (value.trim() === '') {
      return 0;
    }
    
    // Essaye de parser
    const parsed = parseFloat(value);
    
    // Si parseFloat échoue, essaie Number()
    if (isNaN(parsed)) {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    }
    
    return parsed;
  }
  
  // Pour tout autre type
  return Number(value) || 0;
};

const CategoryScoresView: React.FC = () => {
  const params = useParams<{ id: string; categoryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [roundId, setRoundId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<CandidateScore[]>([]);
  const [statistics, setStatistics] = useState<ScoreStatistics | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');
  const [showComments, setShowComments] = useState(false);

  // Initialiser les IDs depuis les params
  useEffect(() => {
    if (!params.id || !params.categoryId) {
      toast.error('Paramètres de route manquants');
      navigate('/admin/rounds');
      return;
    }
    
    setRoundId(params.id);
    setCategoryId(params.categoryId);
  }, [params, navigate]);

  // Charger les données quand les IDs sont disponibles
  useEffect(() => {
    if (roundId && categoryId) {
      fetchScores();
    }
  }, [roundId, categoryId]);

 const fetchScores = async () => {
  try {
    setLoading(true);
    
    console.log('🔍 Fetching scores pour:', { roundId, categoryId });
    
    // 1. Récupérer les scores
    const scoresRes = await adminService.getCategoryScores(roundId, categoryId);
    
    console.log('📊 Réponse API complète:', scoresRes);
    
    // 2. Extraire les données selon la structure
    let rawData: any[] = [];
    
    if (scoresRes && typeof scoresRes === 'object') {
      // Structure { success: true, data: [...] }
      if (scoresRes.success && Array.isArray(scoresRes.data)) {
        rawData = scoresRes.data;
        console.log('✅ Structure: { success: true, data: [...] }');
      }
      // Structure { data: [...] }
      else if (Array.isArray(scoresRes.data)) {
        rawData = scoresRes.data;
        console.log('✅ Structure: { data: [...] }');
      }
      // Si c'est déjà un tableau
      else if (Array.isArray(scoresRes)) {
        rawData = scoresRes;
        console.log('✅ Structure: Tableau direct');
      }
    }
    
    console.log('📦 Données brutes extraites:', rawData.length, 'éléments');
    
    if (rawData.length > 0) {
      const first = rawData[0];
      console.log('🎯 PREMIER ÉLÉMENT BRUT:', {
        nom: first.candidate_name,
        total_score: first.total_score,
        total_score_type: typeof first.total_score,
        average_per_question: first.average_per_question,
        judges_count: first.judges_count
      });
    }
    
    // 3. Conversion FORCÉE
    const convertedScores: CandidateScore[] = rawData.map((item: any): CandidateScore => {
      // Fonction de conversion robuste
      const convertToNumber = (value: any): number => {
        if (value == null || value === '') return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        }
        return Number(value) || 0;
      };
      
      return {
        candidate_id: item.candidate_id || '',
        candidate_name: item.candidate_name || '',
        registration_number: item.registration_number || '',
        category: item.category || '',
        total_score: convertToNumber(item.total_score),
        average_per_question: convertToNumber(item.average_per_question),
        judges_count: convertToNumber(item.judges_count),
        judges_details: Array.isArray(item.judges_details) 
          ? item.judges_details.map((judge: any) => ({
              judge_id: judge.judge_id || '',
              judge_name: judge.judge_name || '',
              judge_total: convertToNumber(judge.judge_total),
              questions: Array.isArray(judge.questions)
                ? judge.questions.map((q: any) => ({
                    question_number: q.question_number || 0,
                    recitation_score: convertToNumber(q.recitation_score),
                    siffat_score: convertToNumber(q.siffat_score),
                    makharij_score: convertToNumber(q.makharij_score),
                    minor_error_score: convertToNumber(q.minor_error_score),
                    question_total: convertToNumber(q.question_total),
                    comment: q.comment || ''
                  }))
                : []
            }))
          : []
      };
    });
    
    // 4. Vérification
    if (convertedScores.length > 0) {
      console.log('✅ PREMIER SCORE CONVERTI:', {
        nom: convertedScores[0].candidate_name,
        total_score: convertedScores[0].total_score,
        total_score_type: typeof convertedScores[0].total_score
      });
      
      // Affiche aussi dans la page pour debug
      console.log('👁️ À AFFICHER:', convertedScores[0].total_score, '/ 30');
    }
    
    setScores(convertedScores);
    
    // 5. Statistiques
    try {
      const statsRes = await adminService.getScoreStatistics(roundId, categoryId);
      if (statsRes?.data) {
        setStatistics(statsRes.data);
      }
    } catch (statsError) {
      console.warn('Erreur stats:', statsError);
    }
    
  } catch (error) {
    console.error('❌ Erreur fetchScores:', error);
    toast.error('Erreur chargement des scores');
  } finally {
    setLoading(false);
  }
};

  const calculateGrade = (score: number): string => {
    const maxScore = 30; // Score max sur 30 points
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 85) return 'Excellent';
    if (percentage >= 70) return 'Très bien';
    if (percentage >= 60) return 'Bien';
    if (percentage >= 50) return 'Passable';
    return 'À améliorer';
  };

  const getGradeColor = (score: number): string => {
    const maxScore = 30; // Score max sur 30 points
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 85) return 'text-green-600 bg-green-50';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getProgressPercentage = (score: number): number => {
    const maxScore = 30; // Score max sur 30 points
    return (score / maxScore) * 100;
  };

  const renderCandidateDetails = (candidate: CandidateScore) => {
    const safeTotalScore = parseScoreValue(candidate.total_score);
    const hasJudges = candidate.judges_details && candidate.judges_details.length > 0;
    
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Détails des notes - {candidate.candidate_name}
          </h4>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {showComments ? <EyeOff size={16} /> : <Eye size={16} />}
            {showComments ? 'Masquer les commentaires' : 'Afficher les commentaires'}
          </button>
        </div>
        
        {hasJudges ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question
                  </th>
                  {candidate.judges_details.map(judge => (
                    <th key={judge.judge_id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {judge.judge_name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moyenne
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map(questionNum => (
                  <tr key={questionNum} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">Question {questionNum}</div>
                    </td>
                    
                    {candidate.judges_details.map(judge => {
                      const question = judge.questions?.find(q => q.question_number === questionNum);
                      const safeQuestionTotal = parseScoreValue(question?.question_total);
                      
                      return (
                        <td key={`${judge.judge_id}-${questionNum}`} className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {safeQuestionTotal.toFixed(2)}
                              <span className="text-xs text-gray-500 ml-1">/ 6</span>
                            </div>
                            <div className="text-xs text-gray-500 space-y-0.5">
                              <div>Récitation: {parseScoreValue(question?.recitation_score).toFixed(2)}/2</div>
                              <div>Çifât: {parseScoreValue(question?.siffat_score).toFixed(2)}/1</div>
                              <div>Makhârij: {parseScoreValue(question?.makharij_score).toFixed(2)}/2</div>
                              <div>Erreurs: {parseScoreValue(question?.minor_error_score).toFixed(2)}/1</div>
                            </div>
                            {showComments && question?.comment && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
                                <div className="font-medium mb-1">Commentaire:</div>
                                {question.comment}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-lg text-gray-900">
                        {hasJudges ? (
                          candidate.judges_details.reduce((sum, judge) => {
                            const question = judge.questions?.find(q => q.question_number === questionNum);
                            return sum + parseScoreValue(question?.question_total);
                          }, 0) / candidate.judges_details.length
                        ).toFixed(2) : '0.00'}
                        <span className="text-sm font-normal text-gray-500 ml-1">/ 6</span>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Ligne des totaux par jury */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  {candidate.judges_details.map(judge => {
                    const safeJudgeTotal = parseScoreValue(judge.judge_total);
                    return (
                      <td key={judge.judge_id} className="px-4 py-3">
                        <div className="text-lg text-gray-900">
                          {safeJudgeTotal.toFixed(2)}
                          <span className="text-sm font-normal text-gray-500 ml-1">/ 30</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <div className="text-2xl font-bold text-green-600">
                      {safeTotalScore.toFixed(2)}
                      <span className="text-lg font-normal text-gray-500 ml-1">/ 30</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Aucun détail de score disponible
          </div>
        )}
      </div>
    );
  };

  const renderScoreCard = (candidate: CandidateScore) => {
    const safeTotalScore = parseScoreValue(candidate.total_score);
    const safeAveragePerQuestion = parseScoreValue(candidate.average_per_question);
    const safeJudgesCount = parseScoreValue(candidate.judges_count);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{candidate.candidate_name}</h3>
            <p className="text-sm text-gray-500">{candidate.registration_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(safeTotalScore)}`}>
              {calculateGrade(safeTotalScore)}
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {safeTotalScore.toFixed(2)}
              <span className="text-sm font-normal text-gray-500 ml-1">/ 30</span>
            </span>
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Score global</span>
            <span>{getProgressPercentage(safeTotalScore).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage(safeTotalScore)}%` }}
            />
          </div>
        </div>
        
        {/* Détails rapides */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {safeAveragePerQuestion.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Moyenne / question</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {safeJudgesCount}/3
            </div>
            <div className="text-xs text-gray-600">Jurys ayant noté</div>
          </div>
        </div>
        
        <button
          onClick={() => setSelectedCandidate(
            selectedCandidate === candidate.candidate_id ? null : candidate.candidate_id
          )}
          className="w-full flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium py-2"
        >
          {selectedCandidate === candidate.candidate_id ? 'Masquer les détails' : 'Voir les détails'}
          <ChevronRight className={`transform ${selectedCandidate === candidate.candidate_id ? 'rotate-90' : ''}`} size={16} />
        </button>
        
        {selectedCandidate === candidate.candidate_id && renderCandidateDetails(candidate)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!roundId || !categoryId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Paramètres manquants</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/admin/rounds/${roundId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Retour au tour
          </button>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <BarChart className="text-purple-600" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Détails des scores</h1>
                  <div className="flex items-center gap-4 mt-2 text-gray-600">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>{scores.length} candidats</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award size={16} />
                      <span>Tour {location.state?.roundName || ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={16} />
                      <span>Catégorie: {location.state?.categoryName || ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-4 py-2 ${viewMode === 'summary' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('details')}
                  className={`px-4 py-2 ${viewMode === 'details' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  <List size={18} />
                </button>
              </div>
              <button className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
                <Download size={18} />
                Exporter
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Moyenne générale</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statistics.average_total.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="text-green-600" size={32} />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Meilleur score</p>
                  <p className="text-3xl font-bold text-green-600">
                    {statistics.highest_score.toFixed(2)}
                  </p>
                </div>
                <Star className="text-yellow-600" size={32} />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Score minimum</p>
                  <p className="text-3xl font-bold text-red-600">
                    {statistics.lowest_score.toFixed(2)}
                  </p>
                </div>
                <Target className="text-red-600" size={32} />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Écart-type</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {statistics.standard_deviation.toFixed(2)}
                  </p>
                </div>
                <BarChart className="text-blue-600" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Distribution des scores */}
        {statistics && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution des scores</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{statistics.excellent_count}</div>
                <div className="text-sm text-gray-600">Excellent (≥25)</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{statistics.good_count}</div>
                <div className="text-sm text-gray-600">Bon (20-25)</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">{statistics.average_count}</div>
                <div className="text-sm text-gray-600">Moyen (15-20)</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{statistics.poor_count}</div>
                <div className="text-sm text-gray-600">Faible (&lt;15)</div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des scores */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Scores des candidats
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({scores.length} candidats)
              </span>
            </h2>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher un candidat..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                onChange={(e) => {
                  // Tu peux ajouter une logique de filtrage ici
                }}
              />
            </div>
          </div>
          
          {viewMode === 'summary' ? (
            // Vue cartes
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scores.map(candidate => renderScoreCard(candidate))}
            </div>
          ) : (
            // Vue tableau
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rang
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Candidat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Moyenne/question
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jurys
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scores.map((candidate, index) => {
                      const safeTotalScore = parseScoreValue(candidate.total_score);
                      const safeAveragePerQuestion = parseScoreValue(candidate.average_per_question);
                      const safeJudgesCount = parseScoreValue(candidate.judges_count);
                      
                      return (
                        <tr key={candidate.candidate_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              index === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              <span className="font-bold">{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-gray-900">{candidate.candidate_name}</div>
                              <div className="text-sm text-gray-500">{candidate.registration_number}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`text-2xl font-bold ${getGradeColor(safeTotalScore)}`}>
                                {safeTotalScore.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">/ 30</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-medium text-gray-900">
                              {safeAveragePerQuestion.toFixed(2)}
                              <span className="text-sm font-normal text-gray-500 ml-1">/ 6</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-gray-400" />
                              <span className="text-gray-700">
                                {safeJudgesCount}/3
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => navigate(`/admin/candidates/${candidate.candidate_id}/scores/${roundId}`)}
                              className="text-green-600 hover:text-green-800 flex items-center gap-1"
                            >
                              <FileText size={16} />
                              Voir détails
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Boutons d'action */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate(`/admin/rounds/${roundId}`)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Retour
          </button>
          <button
            onClick={() => navigate(`/admin/rounds/${roundId}/categories/${categoryId}/qualify`)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Passer à la qualification
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryScoresView;