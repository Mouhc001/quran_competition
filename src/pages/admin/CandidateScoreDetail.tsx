// src/pages/admin/CandidateScoreDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { 
  ArrowLeft, Award, FileText, Users, Star, CheckCircle, XCircle,
  Target, BarChart, ChevronRight, ChevronDown, ChevronUp,
  MessageSquare, User, Hash, Calculator, TrendingUp, Grid, List,
  Eye, EyeOff, ClipboardList
} from 'lucide-react';

// Interface pour la réponse API
interface QuestionScore {
  question_number: number;
  recitation_score: number;
  siffat_score: number;
  makharij_score: number;
  minor_error_score: number;
  question_total: number;
  comment: string;
}

interface JudgeScore {
  judge_id: string;
  judge_name: string;
  judge_code: string;
  judge_total: number; // Score du jury sur 30
  questions: QuestionScore[];
}

interface ScoreData {
  candidate_id: string;
  candidate_name: string;
  registration_number: string;
  category_name: string;
  round_name: string;
  total_score: number; // Score sur 20
  average_per_question: number; // Moyenne sur 6
  final_score: number;
  judges_count: number;
  is_complete: boolean;
  judges_needed: number;
  scores_by_judge?: JudgeScore[];
  judges_details?: JudgeScore[];
}

const CandidateScoreDetail: React.FC = () => {
  const { candidateId, roundId } = useParams<{ candidateId: string; roundId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [showComments, setShowComments] = useState(true);
  const [expandedQuestionDetails, setExpandedQuestionDetails] = useState<number[]>([]);

  // Récupérer les infos depuis le state de navigation
  const { 
    candidateName, 
    registrationNumber, 
    categoryName, 
    categoryId,
    roundName 
  } = location.state || {};

  useEffect(() => {
    if (candidateId && roundId) {
      fetchScoreDetail();
    }
  }, [candidateId, roundId]);

  const fetchScoreDetail = async () => {
    try {
      setLoading(true);
      
      if (!candidateId || !roundId) {
        toast.error('Paramètres manquants');
        return;
      }

      // 1. Récupérer les scores calculés par le back-end via adminService
      // Utiliser getCandidateScoreSummary qui existe dans adminService
      const scoreSummaryRes = await adminService.getCandidateScoreSummary(candidateId, roundId);
      
      if (scoreSummaryRes.success && scoreSummaryRes.data) {
        const data = scoreSummaryRes.data;
        
        // 2. Récupérer les scores par catégorie pour avoir le même calcul que CategoryCandidates
        // Si on a la catégorie dans le state, on l'utilise
        const categoryIdToUse = categoryId || data.category_id;
        
        if (categoryIdToUse) {
          const categoryScoresRes = await adminService.getScoresByRoundCategory(roundId, categoryIdToUse);
          
          let totalScoreFromCategory = data.total_score || 0;
          
          // Vérifier si le score est cohérent avec CategoryCandidates
          if (categoryScoresRes.success && categoryScoresRes.data) {
            const candidateFromCategory = categoryScoresRes.data.find(
              (c: any) => c.candidate_id === candidateId
            );
            
            if (candidateFromCategory && candidateFromCategory.total_score !== undefined) {
              totalScoreFromCategory = candidateFromCategory.total_score;
            }
          }
          
          // Si total_score est > 20, c'est qu'il est sur 30, on le convertit
          let finalTotalScore = totalScoreFromCategory;
          if (finalTotalScore > 20) {
            // Convertir de 30 à 20
            finalTotalScore = (finalTotalScore / 30) * 20;
          }
          
          // Calculer average_per_question si nécessaire
          let averagePerQuestion = data.average_per_question || 0;
          if (averagePerQuestion === 0 && finalTotalScore > 0) {
            // Calculer à partir du score sur 20
            averagePerQuestion = (finalTotalScore / 20) * 6;
          }
          
          const scoreDataFormatted: ScoreData = {
            candidate_id: candidateId,
            candidate_name: data.candidate_name || candidateName || 'Candidat',
            registration_number: data.registration_number || registrationNumber || '',
            category_name: data.category_name || categoryName || '',
            round_name: data.round_name || roundName || '',
            total_score: finalTotalScore, // Score sur 20
            average_per_question: averagePerQuestion, // Moyenne sur 6
            final_score: Math.round(finalTotalScore * 100) / 100, // Arrondi à 2 décimales
            judges_count: data.judges_count || 0,
            is_complete: (data.judges_count || 0) >= 3,
            judges_needed: Math.max(0, 3 - (data.judges_count || 0)),
            scores_by_judge: data.judges_details || data.scores_by_judge || []
          };
          
          setScoreData(scoreDataFormatted);
        } else {
          // Fallback si on n'a pas la catégorie
          let totalScore = data.total_score || 0;
          if (totalScore > 20) {
            totalScore = (totalScore / 30) * 20;
          }
          
          const scoreDataFormatted: ScoreData = {
            candidate_id: candidateId,
            candidate_name: data.candidate_name || candidateName || 'Candidat',
            registration_number: data.registration_number || registrationNumber || '',
            category_name: data.category_name || categoryName || '',
            round_name: data.round_name || roundName || '',
            total_score: totalScore,
            average_per_question: data.average_per_question || 0,
            final_score: Math.round(totalScore * 100) / 100,
            judges_count: data.judges_count || 0,
            is_complete: (data.judges_count || 0) >= 3,
            judges_needed: Math.max(0, 3 - (data.judges_count || 0)),
            scores_by_judge: data.judges_details || data.scores_by_judge || []
          };
          
          setScoreData(scoreDataFormatted);
        }
      } else {
        // Fallback: essayer getCandidateDetailedScores
        const detailedRes = await adminService.getCandidateDetailedScores(candidateId, roundId);
        
        if (detailedRes.success && detailedRes.data) {
          const data = detailedRes.data;
          
          let totalScore = data.total_score || 0;
          if (totalScore > 20) {
            totalScore = (totalScore / 30) * 20;
          }
          
          const scoreDataFormatted: ScoreData = {
            candidate_id: candidateId,
            candidate_name: candidateName || 'Candidat',
            registration_number: registrationNumber || '',
            category_name: categoryName || '',
            round_name: roundName || '',
            total_score: totalScore,
            average_per_question: data.average_per_question || 0,
            final_score: Math.round(totalScore * 100) / 100,
            judges_count: data.judges_count || 0,
            is_complete: (data.judges_count || 0) >= 3,
            judges_needed: Math.max(0, 3 - (data.judges_count || 0)),
            scores_by_judge: data.scores_by_judge || data.judges_details || []
          };
          
          setScoreData(scoreDataFormatted);
        } else {
          toast.error('Aucune donnée de score disponible pour ce candidat');
        }
      }
    } catch (error: any) {
      console.error('Erreur détaillée:', error);
      toast.error(error.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionDetailExpansion = (questionNumber: number) => {
    setExpandedQuestionDetails(prev =>
      prev.includes(questionNumber)
        ? prev.filter(q => q !== questionNumber)
        : [...prev, questionNumber]
    );
  };

  const calculateMaxScorePerQuestion = () => 6;
  const calculateMaxTotalScore = () => calculateMaxScorePerQuestion() * 5;

  const getScoreColor = (score: number, maxScore: number = 20) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 70) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 30) return 'text-orange-500';
    return 'text-red-600';
  };

  const getScoreBarWidth = (score: number, maxScore: number = 20) => {
    return `${(score / maxScore) * 100}%`;
  };

  const safeToFixed = (value: number | undefined | null, decimals: number = 2) => {
    if (value === undefined || value === null || isNaN(value)) return '0.00';
    
    const exactValues = [0, 0.25, 0.5, 0.75, 1, 1.5, 2];
    const exactMatch = exactValues.find(v => Math.abs(v - value) < 0.001);
    
    if (exactMatch !== undefined) {
      return exactMatch.toString();
    }
    
    return value.toFixed(decimals);
  };

  const safeParseFloat = (value: any) => {
    if (value === undefined || value === null) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // Fonction pour organiser les données par question
  const getQuestionsByNumber = () => {
    const judges = scoreData?.scores_by_judge || scoreData?.judges_details || [];
    const questionsByNumber: {[key: number]: {judgeScores: any[]}} = {};
    
    // Initialiser les 5 questions
    for (let i = 1; i <= 5; i++) {
      questionsByNumber[i] = {
        judgeScores: []
      };
    }
    
    judges.forEach(judge => {
      judge.questions?.forEach(question => {
        const qNum = question.question_number;
        if (!questionsByNumber[qNum]) return;
        
        questionsByNumber[qNum].judgeScores.push({
          judge_id: judge.judge_id,
          judge_name: judge.judge_name,
          judge_code: judge.judge_code,
          ...question
        });
      });
    });
    
    return questionsByNumber;
  };

  const renderByQuestionView = () => {
    const judges = scoreData?.scores_by_judge || scoreData?.judges_details || [];
    const questionsByNumber = getQuestionsByNumber();
    
    if (judges.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune évaluation</h3>
          <p className="text-gray-600">Aucun jury n'a encore évalué ce candidat.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map(questionNumber => {
          const questionData = questionsByNumber[questionNumber];
          const judgeScores = questionData.judgeScores;
          
          // Calculer la moyenne de cette question
          const averageTotal = judgeScores.length > 0
            ? judgeScores.reduce((sum, js) => sum + safeParseFloat(js.question_total), 0) / judgeScores.length
            : 0;
          
          const maxScore = calculateMaxScorePerQuestion();
          
          return (
            <div key={questionNumber} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Question Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
                onClick={() => toggleQuestionDetailExpansion(questionNumber)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-purple-600">Q{questionNumber}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Question {questionNumber}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{judgeScores.length} jurys ont noté</span>
                        
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {safeToFixed(averageTotal)}/{maxScore}
                      </div>
                      <div className="text-sm text-gray-600">Score moyen</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {expandedQuestionDetails.includes(questionNumber) ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
              </div>
              
              {/* Question Details - PAS DE LIGNE DES MOYENNES */}
              {expandedQuestionDetails.includes(questionNumber) && (
                <div className="p-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Users size={16} />
                      Notes par jury pour la question {questionNumber}
                    </h4>
                    <button
                      onClick={() => setShowComments(!showComments)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      {showComments ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showComments ? 'Masquer commentaires' : 'Afficher commentaires'}
                    </button>
                  </div>
                  
                  {/* Table des jurys */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jury
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Récitation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Siffat
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Makharij
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Erreurs
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          {showComments && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Commentaire
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {judgeScores.map((judgeScore, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-gray-900">{judgeScore.judge_name}</div>
                                <div className="text-sm text-gray-500">{judgeScore.judge_code}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-center">
                                <div className="font-medium text-gray-900">
                                  {safeToFixed(judgeScore.recitation_score, 1)}
                                </div>
                                <div className="text-xs text-gray-500">/2</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-center">
                                <div className="font-medium text-gray-900">
                                  {safeToFixed(judgeScore.siffat_score, 1)}
                                </div>
                                <div className="text-xs text-gray-500">/1</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-center">
                                <div className="font-medium text-gray-900">
                                  {safeToFixed(judgeScore.makharij_score, 1)}
                                </div>
                                <div className="text-xs text-gray-500">/2</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-center">
                                <div className="font-medium text-gray-900">
                                  {safeToFixed(judgeScore.minor_error_score, 1)}
                                </div>
                                <div className="text-xs text-gray-500">/1</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-center">
                                <div className="text-lg font-bold text-gray-900">
                                  {safeToFixed(judgeScore.question_total)}
                                </div>
                                <div className="text-xs text-gray-500">/6</div>
                              </div>
                            </td>
                            {showComments && (
                              <td className="px-4 py-3 max-w-xs">
                                {judgeScore.comment ? (
                                  <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                    {judgeScore.comment}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Aucun commentaire</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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

  if (!scoreData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun score disponible</h3>
            <p className="text-gray-600 mb-6">
              Les scores pour ce candidat n'ont pas encore été enregistrés.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700"
            >
              <ArrowLeft size={16} />
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  const judges = scoreData.scores_by_judge || scoreData.judges_details || [];
  const totalScore = safeParseFloat(scoreData.total_score); // Score sur 20
  const averagePerQuestion = safeParseFloat(scoreData.average_per_question); // Moyenne sur 6
  const finalScore = safeParseFloat(scoreData.final_score); // Score final arrondi
  const judgesCount = scoreData.judges_count || 0;

  // Calcul du score brut sur 30 (pour information)
  const totalScoreRaw = (totalScore / 20) * 30;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Award className="text-blue-600" size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {scoreData.candidate_name || 'Candidat'}
                  </h1>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Hash size={16} />
                      <span>{scoreData.registration_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Target size={16} />
                      <span>{scoreData.category_name || 'Catégorie'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Star size={16} />
                      <span>{scoreData.round_name || 'Tour'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">
                {safeToFixed(totalScore)}/20
              </div>
              <div className="text-sm text-gray-600">Score finale</div>
              
            </div>
          </div>
        </div>

        
          
            
             

        {/* Vue par question */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList size={24} />
              Détail par question
            </h2>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  showComments 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {showComments ? <EyeOff size={16} /> : <Eye size={16} />}
                {showComments ? 'Masquer commentaires' : 'Afficher commentaires'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileText size={16} />
                Imprimer
              </button>
            </div>
          </div>
          
          {renderByQuestionView()}
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Retour à la liste
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/admin/candidates/${scoreData.candidate_id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <User size={18} />
              Voir le profil complet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateScoreDetail;