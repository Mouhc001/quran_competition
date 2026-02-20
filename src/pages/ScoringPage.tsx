import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  Trophy, 
  Save, 
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService, roundService, scoreService, QuestionScore, Candidate } from '../api/service';
import { api } from '../api/client';  

// Définir un type pour les questions avec des valeurs nulles
interface InitialQuestionScore {
  recitation: number | null;
  siffat: number | null;
  makharij: number | null;
  minorError: number | null;
  comment: string;
}

const ScoringPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // États
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InitialQuestionScore[]>([
    { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showComments, setShowComments] = useState(true);

  // Récupérer les données du jury
  const judgeData = JSON.parse(localStorage.getItem('judge_data') || '{}');

  // Requête pour récupérer tous les tours
  const { data: roundsResponse } = useQuery({
    queryKey: ['allRounds'],
    queryFn: async () => {
      const response = await api.get('/judges/rounds');
      return response.data;
    },
  });

  const rounds = roundsResponse?.data || [];

  // Requête pour récupérer les candidats du tour sélectionné
  const { data: candidatesResponse, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['judge-candidates', selectedRound],
    queryFn: async () => {
      const endpoint = selectedRound 
        ? `/judges/round-candidates/${selectedRound}`
        : '/judges/active-candidates';
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: !!selectedRound || true,
  });

  const candidates = candidatesResponse?.data || [];
  const currentRound = candidatesResponse?.round || {};

  // Initialiser avec le tour actif
  useEffect(() => {
    if (rounds.length > 0 && !selectedRound) {
      const activeRound = rounds.find((r: any) => r.is_active);
      if (activeRound) {
        setSelectedRound(activeRound.id);
      } else if (rounds.length > 0) {
        setSelectedRound(rounds[0].id);
      }
    }
  }, [rounds]);

  // Mutation pour soumettre les scores
  const submitScoresMutation = useMutation({
    mutationFn: ({ candidateId, roundId, questions }: { 
      candidateId: string; 
      roundId: string; 
      questions: InitialQuestionScore[] 
    }) => {
      // Convertir les questions pour l'API (remplacer null par 0 pour l'envoi)
      const apiQuestions: QuestionScore[] = questions.map(q => ({
        recitation: q.recitation || 0,
        siffat: q.siffat || 0,
        makharij: q.makharij || 0,
        minorError: q.minorError || 0,
        comment: q.comment
      }));
      
      return scoreService.submit(candidateId as any, roundId as any, apiQuestions);
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || 'Scores enregistrés avec succès!', {
        icon: '✅',
        duration: 3000,
      });
      
      queryClient.invalidateQueries({ queryKey: ['judge-candidates', selectedRound] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      
      const currentIndex = candidates.findIndex((c: Candidate) => c.id === selectedCandidate?.id);
      if (currentIndex < candidates.length - 1) {
        handleCandidateSelect(candidates[currentIndex + 1]);
      } else {
        setSelectedCandidate(null);
        toast('🏆 Tous les candidats ont été notés!', {
          duration: 4000,
        });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      toast.error(message);
      console.error('Erreur soumission scores:', error);
    },
  });

  // Options de notation avec couleurs harmonisées (vert pour le meilleur, rouge pour le pire)
  const getScoreColor = (value: number | null, max: number) => {
    if (value === null) return 'bg-gray-400 hover:bg-gray-500'; // Non noté - Gris
    const percentage = (value / max) * 100;
    if (percentage === 100) return 'bg-green-600 hover:bg-green-700'; // Max - Vert foncé
    if (percentage >= 75) return 'bg-blue-600 hover:bg-blue-700';     // Très bon - Bleu
    if (percentage >= 50) return 'bg-blue-500 hover:bg-blue-600';     // Bon - Bleu clair
    if (percentage >= 25) return 'bg-orange-500 hover:bg-orange-600'; // Moyen - Orange
    if (percentage > 0) return 'bg-orange-400 hover:bg-orange-500';   // Faible - Orange clair
    return 'bg-red-500 hover:bg-red-600';                           // 0 - Rouge
  };

  const recitationOptions = [
    { value: 2, label: '2' },
    { value: 1.5, label: '1.5' },
    { value: 1, label: '1' },
    { value: 0.5, label: '0.5' },
    { value: 0, label: '0' },
  ];

  const siffatOptions = [
    { value: 1, label: '1' },
    { value: 0.75, label: '0.75' },
    { value: 0.5, label: '0.5' },
    { value: 0.25, label: '0.25' },
    { value: 0, label: '0' },
  ];

  const makharijOptions = [
    { value: 2, label: '2' },
    { value: 1.5, label: '1.5' },
    { value: 1, label: '1' },
    { value: 0.5, label: '0.5' },
    { value: 0, label: '0' },
  ];

  const minorErrorOptions = [
    { value: 1, label: '1' },
    { value: 0.75, label: '0.75' },
    { value: 0.5, label: '0.5' },
    { value: 0.25, label: '0.25' },
    { value: 0, label: '0' },
  ];

  // Calculs
  const calculateQuestionTotal = (question: InitialQuestionScore) => {
    const recitation = question.recitation || 0;
    const siffat = question.siffat || 0;
    const makharij = question.makharij || 0;
    const minorError = question.minorError || 0;
    return recitation + siffat + makharij + minorError;
  };

  const calculateTotalScore = () => {
    return questions.reduce((sum, q) => sum + calculateQuestionTotal(q), 0);
  };

  const getScoreDisplayColor = (score: number | null, max: number) => {
    if (score === null) return 'text-gray-600 bg-gray-100 border-gray-300'; // Non noté
    
    const percentage = (score / max) * 100;
    if (percentage === 100) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 50) return 'text-blue-500 bg-blue-50 border-blue-200';
    if (percentage >= 25) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (percentage > 0) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getCandidateStatus = (candidateId: number) => {
    return 'pending';
  };

  // Vérifier si une question a été notée
  const isQuestionScored = (question: InitialQuestionScore) => {
    return (
      question.recitation !== null &&
      question.siffat !== null &&
      question.makharij !== null &&
      question.minorError !== null
    );
  };

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('judge_token');
    localStorage.removeItem('judge_data');
    navigate('/login');
    toast.success('Déconnexion réussie');
  };

  const handleRoundChange = (roundId: string) => {
    setSelectedRound(roundId);
    setSelectedCandidate(null);
    setCurrentQuestion(0);
    setQuestions([
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
    ]);
  };

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCurrentQuestion(0);
    
    setQuestions([
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
    ]);
  };

  const handleSaveScores = async () => {
    if (!selectedCandidate || !selectedRound) {
      toast.error('Veuillez sélectionner un candidat');
      return;
    }

    // Vérifier si le tour est actif
    if (!currentRound?.is_active) {
      toast.error('Ce tour n\'est pas actif. Impossible de noter.');
      return;
    }

    // Vérifier que toutes les questions ont été notées
    const hasUnscoredQuestions = questions.some(q => !isQuestionScored(q));

    if (hasUnscoredQuestions) {
      toast.error('Veuillez noter toutes les questions');
      return;
    }

    // Afficher une confirmation si le score total est 0
    const totalScore = calculateTotalScore();
    if (totalScore === 0) {
      const confirmed = window.confirm(
        'Le score total est 0. Êtes-vous sûr de vouloir enregistrer ce score?\n\n' +
        'Si c\'est une erreur, cliquez sur "Annuler" et vérifiez les notes.\n' +
        'Si le candidat a vraiment eu 0, cliquez sur "OK".'
      );
      
      if (!confirmed) {
        return;
      }
    }

    submitScoresMutation.mutate({
      candidateId: selectedCandidate.id.toString(),
      roundId: selectedRound,
      questions
    });
  };

  const handleNextCandidate = () => {
    if (!selectedCandidate) return;
    
    const currentIndex = candidates.findIndex((c: Candidate) => c.id === selectedCandidate.id);
    if (currentIndex < candidates.length - 1) {
      handleCandidateSelect(candidates[currentIndex + 1]);
    }
  };

  const handlePrevCandidate = () => {
    if (!selectedCandidate) return;
    
    const currentIndex = candidates.findIndex((c: Candidate) => c.id === selectedCandidate.id);
    if (currentIndex > 0) {
      handleCandidateSelect(candidates[currentIndex - 1]);
    }
  };

  const handleResetScores = () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser tous les scores pour ce candidat ?')) {
      setQuestions([
        { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, comment: '' },
      ]);
      toast.success('Scores réinitialisés');
    }
  };

  if (!judgeData.id) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Concours de Récitation du Coran
                </h1>
                <p className="text-sm text-gray-600">Système de notation en direct</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Menu déroulant pour choisir le tour */}
              <div className="hidden md:block relative">
                <select
                  value={selectedRound || ''}
                  onChange={(e) => handleRoundChange(e.target.value)}
                  className="appearance-none px-4 py-2 pl-10 pr-8 border border-gray-300 
                           rounded-lg bg-white focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent min-w-[220px] cursor-pointer
                           hover:border-gray-400 transition-colors"
                >
                  <option value="">Sélectionner un tour...</option>
                  {rounds.map((round: any) => (
                    <option key={round.id} value={round.id}>
                      {round.order_index}. {round.name} 
                      {round.is_active && ' 🟢'}
                    </option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Trophy className="w-4 h-4 text-gray-500" />
                </div>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              
              <div className="hidden md:block text-right">
                <p className="text-sm text-gray-600">Tour</p>
                <p className="font-medium text-gray-900">
                  {currentRound?.name || 'Sélectionnez un tour'}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">Jury</p>
                <p className="font-medium text-gray-900">{judgeData.name}</p>
                <p className="text-xs text-gray-500">{judgeData.code}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 
                         hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Liste des candidats */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Candidats</h2>
                <span className="ml-auto px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                  {candidates.length}
                </span>
              </div>

              {!selectedRound ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Veuillez sélectionner un tour</p>
                </div>
              ) : isLoadingCandidates ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-500">Chargement des candidats...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun candidat dans ce tour</p>
                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['judge-candidates', selectedRound] })}
                    className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Actualiser
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {candidates.map((candidate: Candidate) => {
                    const status = getCandidateStatus(candidate.id as any);
                    return (
                      <button
                        key={candidate.id}
                        onClick={() => handleCandidateSelect(candidate)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          selectedCandidate?.id === candidate.id
                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                            : status === 'scored'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">
                            {candidate.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* Affichage du nom de la catégorie au lieu de l'ID */}
                            {candidate.category_name ? (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                candidate.category_name.includes('Hifz') || candidate.category_name.includes('Expert')
                                  ? 'bg-purple-100 text-purple-800'
                                  : candidate.category_name.includes('Avancé')
                                  ? 'bg-blue-100 text-blue-800'
                                  : candidate.category_name.includes('Intermédiaire')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {candidate.category_name}
                              </span>
                            ) : candidate.category_id ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                                {candidate.category_id}
                              </span>
                            ) : null}
                            {status === 'scored' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {candidate.registration_number}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Statistiques */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Statistiques</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">{candidates.length}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Tour</p>
                    <p className="text-xl font-bold text-gray-900">
                      {currentRound?.name?.split(' ')[0] || '-'}
                    </p>
                  </div>
                </div>
                
                {/* Indicateur de tour actif */}
                {selectedRound && (
                  <>
                    {currentRound?.is_active ? (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-800 font-medium">
                            Tour actif - Notation autorisée
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800">
                            Tour non actif - Consultation seulement
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {/* Actions rapides */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 
                             text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {showComments ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showComments ? 'Cacher commentaires' : 'Afficher commentaires'}
                  </button>
                  
                  {selectedCandidate && (
                    <button
                      onClick={handleResetScores}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 
                               text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Réinitialiser les scores
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interface de notation */}
          <div className="lg:col-span-3">
            {!selectedRound ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center 
                              justify-center mx-auto mb-6">
                  <Trophy className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Bienvenue, {judgeData.name}!
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Veuillez sélectionner un tour dans le menu déroulant en haut à droite
                  pour voir la liste des candidats disponibles.
                </p>
              </div>
            ) : !selectedCandidate ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center 
                              justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Tour: {currentRound?.name}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Sélectionnez un candidat dans la liste de gauche pour commencer la notation.
                  Vous noterez 5 questions avec 4 critères par question.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="font-medium text-gray-900">Sélectionner un candidat</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Choisissez dans la liste à gauche
                    </p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="font-medium text-gray-900">Noter les 5 questions</p>
                    <p className="text-sm text-gray-500 mt-1">
                      4 critères par question
                    </p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Save className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="font-medium text-gray-900">Enregistrer les scores</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Total max: 30 points
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* En-tête du candidat */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedCandidate.name}
                        </h2>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {selectedCandidate.registration_number}
                        </span>
                        {/* Affichage du nom de la catégorie pour le candidat sélectionné */}
                        {selectedCandidate.category_name ? (
                          <span className={`px-3 py-1 text-sm rounded-full ${
                            selectedCandidate.category_name.includes('Hifz') || selectedCandidate.category_name.includes('Expert')
                              ? 'bg-purple-100 text-purple-800'
                              : selectedCandidate.category_name.includes('Avancé')
                              ? 'bg-blue-100 text-blue-800'
                              : selectedCandidate.category_name.includes('Intermédiaire')
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedCandidate.category_name}
                          </span>
                        ) : selectedCandidate.category_id ? (
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                            {selectedCandidate.category_id}
                          </span>
                        ) : null}
                        {selectedCandidate.birth_date && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                            {new Date(selectedCandidate.birth_date).getFullYear()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:block text-right">
                        <p className="text-sm text-gray-600">Question</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {currentQuestion + 1}/5
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handlePrevCandidate}
                          disabled={candidates.findIndex((c: Candidate) => c.id === selectedCandidate.id) === 0}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleNextCandidate}
                          disabled={candidates.findIndex((c: Candidate) => c.id === selectedCandidate.id) === candidates.length - 1}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Navigation des questions */}
                  <div className="mt-6">
                    <div className="flex justify-between mb-2">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isScored = isQuestionScored(questions[num - 1]);
                        
                        return (
                          <button
                            key={num}
                            onClick={() => setCurrentQuestion(num - 1)}
                            className={`relative w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                              currentQuestion === num - 1
                                ? 'bg-blue-600 text-white'
                                : isScored
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {num}
                            {isScored && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                                ✓
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestion + 1) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Grille de notation harmonisée */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Question {currentQuestion + 1} - Notation
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Notez chaque critère pour cette question (max 6 points par question)
                    </p>
                  </div>

                  <div className="p-6">
                    {/* Récitation */}
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Récitation / Mémorisation (0-2 points)
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {recitationOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newQuestions = [...questions];
                              newQuestions[currentQuestion].recitation = option.value;
                              setQuestions(newQuestions);
                            }}
                            className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${
                              questions[currentQuestion].recitation === option.value
                                ? getScoreColor(option.value, 2) + ' ring-2 ring-offset-2 ring-opacity-50'
                                : getScoreColor(option.value, 2) + ' opacity-90 hover:opacity-100'
                            }`}
                          >
                            {option.label} point{option.value !== 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Évaluer la précision et la fluidité de la récitation
                      </p>
                    </div>

                    {/* Tajwid - Siffat */}
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Tajwid - Erreur majeure (Siffat) (0-1 point)
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {siffatOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newQuestions = [...questions];
                              newQuestions[currentQuestion].siffat = option.value;
                              setQuestions(newQuestions);
                            }}
                            className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${
                              questions[currentQuestion].siffat === option.value
                                ? getScoreColor(option.value, 1) + ' ring-2 ring-offset-2 ring-opacity-50'
                                : getScoreColor(option.value, 1) + ' opacity-90 hover:opacity-100'
                            }`}
                          >
                            {option.label} point{option.value !== 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Qualité des lettres et règles majeures du Tajwid
                      </p>
                    </div>

                    {/* Tajwid - Makharij */}
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Tajwid - Point d'articulation (Makharij) (0-2 points)
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {makharijOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newQuestions = [...questions];
                              newQuestions[currentQuestion].makharij = option.value;
                              setQuestions(newQuestions);
                            }}
                            className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${
                              questions[currentQuestion].makharij === option.value
                                ? getScoreColor(option.value, 2) + ' ring-2 ring-offset-2 ring-opacity-50'
                                : getScoreColor(option.value, 2) + ' opacity-90 hover:opacity-100'
                            }`}
                          >
                            {option.label} point{option.value !== 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Prononciation correcte des points d'articulation des lettres
                      </p>
                    </div>

                    {/* Erreur mineure */}
                    <div className="mb-8">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Erreur mineure (0-1 point)
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {minorErrorOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newQuestions = [...questions];
                              newQuestions[currentQuestion].minorError = option.value;
                              setQuestions(newQuestions);
                            }}
                            className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${
                              questions[currentQuestion].minorError === option.value
                                ? getScoreColor(option.value, 1) + ' ring-2 ring-offset-2 ring-opacity-50'
                                : getScoreColor(option.value, 1) + ' opacity-90 hover:opacity-100'
                            }`}
                          >
                            {option.label} point{option.value !== 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Petites erreurs sans affecter le sens général
                      </p>
                    </div>

                    {/* Commentaire */}
                    {showComments && (
                      <div className="mb-8">
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-gray-500" />
                          Commentaire (optionnel)
                        </h4>
                        <textarea
                          value={questions[currentQuestion].comment}
                          onChange={(e) => {
                            const newQuestions = [...questions];
                            newQuestions[currentQuestion].comment = e.target.value;
                            setQuestions(newQuestions);
                          }}
                          placeholder="Ajoutez un commentaire sur la performance..."
                          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg 
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                   resize-none"
                        />
                      </div>
                    )}

                    {/* Résumé de la question */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-4">Résumé de la question</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Récitation</p>
                          <p className={`text-2xl font-bold ${
                            getScoreDisplayColor(questions[currentQuestion].recitation, 2).split(' ')[0]
                          }`}>
                            {questions[currentQuestion].recitation !== null ? questions[currentQuestion].recitation : '-'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Siffat</p>
                          <p className={`text-2xl font-bold ${
                            getScoreDisplayColor(questions[currentQuestion].siffat, 1).split(' ')[0]
                          }`}>
                            {questions[currentQuestion].siffat !== null ? questions[currentQuestion].siffat : '-'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Makharij</p>
                          <p className={`text-2xl font-bold ${
                            getScoreDisplayColor(questions[currentQuestion].makharij, 2).split(' ')[0]
                          }`}>
                            {questions[currentQuestion].makharij !== null ? questions[currentQuestion].makharij : '-'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Erreur mineure</p>
                          <p className={`text-2xl font-bold ${
                            getScoreDisplayColor(questions[currentQuestion].minorError, 1).split(' ')[0]
                          }`}>
                            {questions[currentQuestion].minorError !== null ? questions[currentQuestion].minorError : '-'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total question</p>
                        <div className={`inline-flex items-center justify-center 
                          w-24 h-24 rounded-full border-4 text-3xl font-bold
                          ${getScoreDisplayColor(calculateQuestionTotal(questions[currentQuestion]), 6)}`}
                        >
                          {isQuestionScored(questions[currentQuestion]) 
                            ? calculateQuestionTotal(questions[currentQuestion]) 
                            : '-'}
                          <span className="text-lg ml-1">/6</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation et sauvegarde */}
                  <div className="p-6 bg-gray-50 border-t">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestion === 0}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Question précédente
                        </button>
                        <button
                          onClick={() => setCurrentQuestion(prev => Math.min(4, prev + 1))}
                          disabled={currentQuestion === 4}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center"
                        >
                          Question suivante
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total candidat</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {questions.every(q => isQuestionScored(q)) 
                              ? calculateTotalScore() 
                              : '-'}
                            <span className="text-lg text-gray-600 ml-1">/30</span>
                          </p>
                        </div>
                        
                        <button
                          onClick={handleSaveScores}
                          disabled={submitScoresMutation.isPending || !currentRound?.is_active}
                          className={`flex items-center gap-2 px-8 py-3 font-semibold 
                                   rounded-lg hover:opacity-90 transition-all shadow-md
                                   ${currentRound?.is_active 
                                     ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                                     : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                   }`}
                        >
                          {submitScoresMutation.isPending ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white 
                                           border-t-transparent rounded-full animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              {currentRound?.is_active ? 'Enregistrer les scores' : 'Tour non actif'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScoringPage;