// src/pages/admin/CandidateScores.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { 
  ArrowLeft, Award, Users, BarChart, 
  ChevronDown, ChevronUp, CheckCircle, 
  XCircle, Calculator, Target, Star,
  FileText, UserCheck
} from 'lucide-react';

interface JudgeScore {
  judge_id: string;
  judge_name: string;
  judge_code: string;
  questions: Array<{
    question_number: number;
    recitation_score: number;
    siffat_score: number;
    makharij_score: number;
    minor_error_score: number;
    question_total: number;
    comment: string;
  }>;
  total_score: number;
}

interface ScoreSummary {
  judges_count: number;
  total_questions_scored: number;
  total_score: number;
  average_per_question: number;
  final_score: number;
  is_complete: boolean;
  judges_needed: number;
}

interface Candidate {
  id: string;
  name: string;
  registration_number: string;
  category_name?: string;
  round_name?: string;
}

const CandidateScores: React.FC = () => {
  const { candidateId, roundId } = useParams<{ candidateId: string; roundId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [scoresByJudge, setScoresByJudge] = useState<JudgeScore[]>([]);
  const [summary, setSummary] = useState<ScoreSummary | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [expandedJudge, setExpandedJudge] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');

  const { candidateName, roundName, categoryName } = location.state || {};

  useEffect(() => {
    if (candidateId && roundId) {
      fetchScores();
      fetchCandidateDetails();
    }
  }, [candidateId, roundId]);

  const fetchScores = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Chargement scores pour candidat ${candidateId}, tour ${roundId}`);
      
      const response = await adminService.getCandidateScores(candidateId!, roundId!);
      console.log(`🔍 Réponse scores:`, response);
      
      if (response.success) {
        setScoresByJudge(response.data.scores_by_judge || []);
        setSummary(response.data.summary);
      } else {
        toast.error('Erreur chargement des scores');
      }
    } catch (error) {
      console.error('Erreur chargement scores:', error);
      toast.error('Erreur chargement des scores');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateDetails = async () => {
    try {
      const response = await adminService.getCandidateDetails(candidateId!);
      if (response.success) {
        setCandidate(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement candidat:', error);
    }
  };

  const calculateMaxScore = (questionNumber: number) => {
    return 6;
  };

  const calculateTotalMaxScore = () => {
    return 30;
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (percentage >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusBadge = (isComplete: boolean, judgesNeeded: number) => {
    if (isComplete) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
          <CheckCircle size={14} />
          Notation complète (3/3 jurys)
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
          <XCircle size={14} />
          En attente ({3 - judgesNeeded}/3 jurys)
        </span>
      );
    }
  };

  const toggleJudgeExpansion = (judgeId: string) => {
    setExpandedJudge(expandedJudge === judgeId ? null : judgeId);
  };

  // Fonction utilitaire pour formater les nombres avec gestion de null/undefined
  const formatScore = (score: number | null | undefined, decimals: number = 2): string => {
    return (score ?? 0).toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const actualCandidateName = candidate?.name || candidateName || 'Candidat';
  const actualRoundName = candidate?.round_name || roundName || 'Tour';
  const actualCategoryName = candidate?.category_name || categoryName || 'Catégorie';

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
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Award className="text-blue-600" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {actualCandidateName}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {candidate?.registration_number || 'N/A'}
                    </span>
                    <span className="text-gray-600">{actualCategoryName}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600">{actualRoundName}</span>
                  </div>
                </div>
              </div>
              
              {summary && (
                <div className="flex items-center gap-4">
                  {getStatusBadge(summary.is_complete, summary.judges_needed)}
                  <span className="text-gray-600">
                    Score final: <span className="font-bold text-2xl text-green-600">
                      {formatScore(summary.final_score)}/30
                    </span>
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'detailed' ? 'summary' : 'detailed')}
                className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                {viewMode === 'detailed' ? (
                  <>
                    <BarChart size={18} />
                    Vue synthèse
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Vue détaillée
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Jurys ayant noté</p>
                  <p className="text-3xl font-bold text-blue-600">{summary.judges_count}/3</p>
                </div>
                <Users className="text-blue-600" size={32} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {summary.is_complete ? 'Notation complète' : `${summary.judges_needed} jury(s) manquant(s)`}
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Score total</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatScore(summary.total_score)}
                  </p>
                </div>
                <Calculator className="text-green-600" size={32} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Somme de tous les scores des jurys
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Moyenne par question</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatScore(summary.average_per_question)}/6
                  </p>
                </div>
                <BarChart className="text-orange-600" size={32} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Moyenne de toutes les questions notées
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Score final</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatScore(summary.final_score)}/30
                  </p>
                </div>
                <Target className="text-purple-600" size={32} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Moyenne des 3 meilleurs jurys
              </p>
            </div>
          </div>
        )}

        {/* Vue détaillée */}
        {viewMode === 'detailed' ? (
          <div className="space-y-6">
            {scoresByJudge.length > 0 ? (
              scoresByJudge.map((judgeScore, judgeIndex) => (
                <div key={judgeScore.judge_id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                  {/* En-tête du jury */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleJudgeExpansion(judgeScore.judge_id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <UserCheck className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {judgeScore.judge_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Code: {judgeScore.judge_code} • Jury #{judgeIndex + 1}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Score total</p>
                          <p className={`text-2xl font-bold ${
                            getScoreColor(judgeScore.total_score, calculateTotalMaxScore()).split(' ')[0]
                          }`}>
                            {formatScore(judgeScore.total_score)}/30
                          </p>
                        </div>
                        
                        <div>
                          {expandedJudge === judgeScore.judge_id ? (
                            <ChevronUp className="text-gray-400" size={24} />
                          ) : (
                            <ChevronDown className="text-gray-400" size={24} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Détails des questions (expandable) */}
                  {expandedJudge === judgeScore.judge_id && (
                    <div className="border-t border-gray-200">
                      <div className="p-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <FileText size={18} />
                          Détail des 5 questions
                        </h4>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Question
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
                                  Erreur mineure
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Total
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Commentaire
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {judgeScore.questions.map((question, qIndex) => (
                                <tr key={qIndex} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-medium">
                                        {question.question_number}
                                      </div>
                                      <span className="ml-3 font-medium">Question {question.question_number}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      question.recitation_score === 2 ? 'bg-green-100 text-green-800' :
                                      question.recitation_score >= 1.5 ? 'bg-green-50 text-green-700' :
                                      question.recitation_score >= 1 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {formatScore(question.recitation_score, 1)}/2
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      question.siffat_score === 1 ? 'bg-blue-100 text-blue-800' :
                                      question.siffat_score >= 0.75 ? 'bg-blue-50 text-blue-700' :
                                      question.siffat_score >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {formatScore(question.siffat_score, 1)}/1
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      question.makharij_score === 2 ? 'bg-purple-100 text-purple-800' :
                                      question.makharij_score >= 1.5 ? 'bg-purple-50 text-purple-700' :
                                      question.makharij_score >= 1 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {formatScore(question.makharij_score, 1)}/2
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      question.minor_error_score === 1 ? 'bg-amber-100 text-amber-800' :
                                      question.minor_error_score >= 0.75 ? 'bg-amber-50 text-amber-700' :
                                      question.minor_error_score >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {formatScore(question.minor_error_score, 1)}/1
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-lg font-bold ${
                                      getScoreColor(question.question_total, calculateMaxScore(question.question_number))
                                    }`}>
                                      {formatScore(question.question_total)}/6
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="max-w-xs">
                                      {question.comment ? (
                                        <p className="text-sm text-gray-700 italic">"{question.comment}"</p>
                                      ) : (
                                        <p className="text-sm text-gray-400">Aucun commentaire</p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Résumé du jury */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Score moyen par question</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatScore(judgeScore.total_score / 5)}/6
                              </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Total</p>
                              <p className={`text-2xl font-bold ${
                                getScoreColor(judgeScore.total_score, calculateTotalMaxScore()).split(' ')[0]
                              }`}>
                                {formatScore(judgeScore.total_score)}/30
                              </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Pourcentage</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatScore((judgeScore.total_score / calculateTotalMaxScore()) * 100, 1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
                <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun score enregistré</h3>
                <p className="text-gray-600 mb-6">
                  Aucun jury n'a encore noté ce candidat pour ce tour.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                  <Users size={16} />
                  <span>En attente des 3 jurys</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Vue synthèse */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Synthèse des scores</h3>
              <p className="text-sm text-gray-600">Comparaison des 3 jurys</p>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jury
                      </th>
                      {[1, 2, 3, 4, 5].map(qNum => (
                        <th key={qNum} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Q{qNum}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Moyenne
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % 
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scoresByJudge.map((judgeScore, index) => (
                      <tr key={judgeScore.judge_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{judgeScore.judge_name}</div>
                            <div className="text-sm text-gray-500">Jury #{index + 1}</div>
                          </div>
                        </td>
                        {[1, 2, 3, 4, 5].map(qNum => {
                          const question = judgeScore.questions.find(q => q.question_number === qNum);
                          return (
                            <td key={qNum} className="px-4 py-3 whitespace-nowrap">
                              {question ? (
                                <div className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                                  getScoreColor(question.question_total, 6)
                                }`}>
                                  {formatScore(question.question_total)}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`text-lg font-bold ${
                            getScoreColor(judgeScore.total_score, 30).split(' ')[0]
                          }`}>
                            {formatScore(judgeScore.total_score)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {formatScore(judgeScore.total_score / 5)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {formatScore((judgeScore.total_score / 30) * 100, 1)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Ligne de moyenne */}
                    {summary && (
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900">Moyenne</td>
                        {[1, 2, 3, 4, 5].map(qNum => {
                          const questionTotals = scoresByJudge
                            .map(judge => judge.questions.find(q => q.question_number === qNum)?.question_total || 0)
                            .filter(total => total > 0);
                          
                          const average = questionTotals.length > 0 
                            ? questionTotals.reduce((a, b) => a + b, 0) / questionTotals.length 
                            : 0;
                          
                          return (
                            <td key={qNum} className="px-4 py-3 whitespace-nowrap">
                              <div className={`inline-flex items-center px-2 py-1 rounded text-sm ${
                                getScoreColor(average, 6)
                              }`}>
                                {average > 0 ? formatScore(average) : '—'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 whitespace-nowrap text-green-600 font-bold">
                          {formatScore(summary.final_score)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                          {formatScore(summary.final_score / 5)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                          {formatScore((summary.final_score / 30) * 100, 1)}%
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Légende */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Légende des couleurs</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                    <span className="text-sm text-gray-600">≥ 80% (Excellent)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                    <span className="text-sm text-gray-600">60-79% (Bon)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
                    <span className="text-sm text-gray-600">40-59% (Moyen)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                    <span className="text-sm text-gray-600">≤ 39% (À améliorer)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Information importante */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Star className="text-blue-600" size={24} />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Calcul du score final</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• <span className="font-semibold">Chaque jury</span> note 5 questions (max 30 points)</li>
                <li>• <span className="font-semibold">Chaque question</span> est notée sur 6 points (2+1+2+1)</li>
                <li>• <span className="font-semibold">Score final</span> = moyenne des 3 meilleurs jurys</li>
                <li>• Si moins de 3 jurys ont noté, on attend les notations manquantes</li>
                <li>• Le candidat peut être <span className="font-semibold">qualifié</span> quand le score final est disponible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateScores;