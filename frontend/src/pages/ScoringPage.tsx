// src/pages/judge/ScoringPage.tsx
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
  ChevronDown,
  Search,
  Star,
  Award,
  Moon,
  BookOpen,
  Star as StarIcon,
  Calendar,
  Sparkles,
  Book
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scoreService, QuestionScore, Candidate } from '../api/service';
import { api } from '../api/client';  

// Données des sourates avec le nombre de versets
const surahs = [
  { number: 1, name: "Al-Fatiha", verses: 7 },
  { number: 2, name: "Al-Baqarah", verses: 286 },
  { number: 3, name: "Al-Imran", verses: 200 },
  { number: 4, name: "An-Nisa", verses: 176 },
  { number: 5, name: "Al-Ma'idah", verses: 120 },
  { number: 6, name: "Al-An'am", verses: 165 },
  { number: 7, name: "Al-A'raf", verses: 206 },
  { number: 8, name: "Al-Anfal", verses: 75 },
  { number: 9, name: "At-Tawbah", verses: 129 },
  { number: 10, name: "Yunus", verses: 109 },
  { number: 11, name: "Hud", verses: 123 },
  { number: 12, name: "Yusuf", verses: 111 },
  { number: 13, name: "Ar-Ra'd", verses: 43 },
  { number: 14, name: "Ibrahim", verses: 52 },
  { number: 15, name: "Al-Hijr", verses: 99 },
  { number: 16, name: "An-Nahl", verses: 128 },
  { number: 17, name: "Al-Isra", verses: 111 },
  { number: 18, name: "Al-Kahf", verses: 110 },
  { number: 19, name: "Maryam", verses: 98 },
  { number: 20, name: "Ta-Ha", verses: 135 },
  { number: 21, name: "Al-Anbiya", verses: 112 },
  { number: 22, name: "Al-Hajj", verses: 78 },
  { number: 23, name: "Al-Mu'minun", verses: 118 },
  { number: 24, name: "An-Nur", verses: 64 },
  { number: 25, name: "Al-Furqan", verses: 77 },
  { number: 26, name: "Ash-Shu'ara", verses: 227 },
  { number: 27, name: "An-Naml", verses: 93 },
  { number: 28, name: "Al-Qasas", verses: 88 },
  { number: 29, name: "Al-Ankabut", verses: 69 },
  { number: 30, name: "Ar-Rum", verses: 60 },
  { number: 31, name: "Luqman", verses: 34 },
  { number: 32, name: "As-Sajdah", verses: 30 },
  { number: 33, name: "Al-Ahzab", verses: 73 },
  { number: 34, name: "Saba", verses: 54 },
  { number: 35, name: "Fatir", verses: 45 },
  { number: 36, name: "Ya-Sin", verses: 83 },
  { number: 37, name: "As-Saffat", verses: 182 },
  { number: 38, name: "Sad", verses: 88 },
  { number: 39, name: "Az-Zumar", verses: 75 },
  { number: 40, name: "Ghafir", verses: 85 },
  { number: 41, name: "Fussilat", verses: 54 },
  { number: 42, name: "Ash-Shura", verses: 53 },
  { number: 43, name: "Az-Zukhruf", verses: 89 },
  { number: 44, name: "Ad-Dukhan", verses: 59 },
  { number: 45, name: "Al-Jathiyah", verses: 37 },
  { number: 46, name: "Al-Ahqaf", verses: 35 },
  { number: 47, name: "Muhammad", verses: 38 },
  { number: 48, name: "Al-Fath", verses: 29 },
  { number: 49, name: "Al-Hujurat", verses: 18 },
  { number: 50, name: "Qaf", verses: 45 },
  { number: 51, name: "Adh-Dhariyat", verses: 60 },
  { number: 52, name: "At-Tur", verses: 49 },
  { number: 53, name: "An-Najm", verses: 62 },
  { number: 54, name: "Al-Qamar", verses: 55 },
  { number: 55, name: "Ar-Rahman", verses: 78 },
  { number: 56, name: "Al-Waqi'ah", verses: 96 },
  { number: 57, name: "Al-Hadid", verses: 29 },
  { number: 58, name: "Al-Mujadila", verses: 22 },
  { number: 59, name: "Al-Hashr", verses: 24 },
  { number: 60, name: "Al-Mumtahanah", verses: 13 },
  { number: 61, name: "As-Saff", verses: 14 },
  { number: 62, name: "Al-Jumu'ah", verses: 11 },
  { number: 63, name: "Al-Munafiqun", verses: 11 },
  { number: 64, name: "At-Taghabun", verses: 18 },
  { number: 65, name: "At-Talaq", verses: 12 },
  { number: 66, name: "At-Tahrim", verses: 12 },
  { number: 67, name: "Al-Mulk", verses: 30 },
  { number: 68, name: "Al-Qalam", verses: 52 },
  { number: 69, name: "Al-Haqqah", verses: 52 },
  { number: 70, name: "Al-Ma'arij", verses: 44 },
  { number: 71, name: "Nuh", verses: 28 },
  { number: 72, name: "Al-Jinn", verses: 28 },
  { number: 73, name: "Al-Muzzammil", verses: 20 },
  { number: 74, name: "Al-Muddaththir", verses: 56 },
  { number: 75, name: "Al-Qiyamah", verses: 40 },
  { number: 76, name: "Al-Insan", verses: 31 },
  { number: 77, name: "Al-Mursalat", verses: 50 },
  { number: 78, name: "An-Naba", verses: 40 },
  { number: 79, name: "An-Nazi'at", verses: 46 },
  { number: 80, name: "Abasa", verses: 42 },
  { number: 81, name: "At-Takwir", verses: 29 },
  { number: 82, name: "Al-Infitar", verses: 19 },
  { number: 83, name: "Al-Mutaffifin", verses: 36 },
  { number: 84, name: "Al-Inshiqaq", verses: 25 },
  { number: 85, name: "Al-Buruj", verses: 22 },
  { number: 86, name: "At-Tariq", verses: 17 },
  { number: 87, name: "Al-A'la", verses: 19 },
  { number: 88, name: "Al-Ghashiyah", verses: 26 },
  { number: 89, name: "Al-Fajr", verses: 30 },
  { number: 90, name: "Al-Balad", verses: 20 },
  { number: 91, name: "Ash-Shams", verses: 15 },
  { number: 92, name: "Al-Layl", verses: 21 },
  { number: 93, name: "Ad-Duha", verses: 11 },
  { number: 94, name: "Ash-Sharh", verses: 8 },
  { number: 95, name: "At-Tin", verses: 8 },
  { number: 96, name: "Al-Alaq", verses: 19 },
  { number: 97, name: "Al-Qadr", verses: 5 },
  { number: 98, name: "Al-Bayyinah", verses: 8 },
  { number: 99, name: "Az-Zalzalah", verses: 8 },
  { number: 100, name: "Al-Adiyat", verses: 11 },
  { number: 101, name: "Al-Qari'ah", verses: 11 },
  { number: 102, name: "At-Takathur", verses: 8 },
  { number: 103, name: "Al-Asr", verses: 3 },
  { number: 104, name: "Al-Humazah", verses: 9 },
  { number: 105, name: "Al-Fil", verses: 5 },
  { number: 106, name: "Quraysh", verses: 4 },
  { number: 107, name: "Al-Ma'un", verses: 7 },
  { number: 108, name: "Al-Kawthar", verses: 3 },
  { number: 109, name: "Al-Kafirun", verses: 6 },
  { number: 110, name: "An-Nasr", verses: 3 },
  { number: 111, name: "Al-Masad", verses: 5 },
  { number: 112, name: "Al-Ikhlas", verses: 4 },
  { number: 113, name: "Al-Falaq", verses: 5 },
  { number: 114, name: "An-Nas", verses: 6 }
];

interface InitialQuestionScore {
  recitation: number | null;
  siffat: number | null;
  makharij: number | null;
  minorError: number | null;
  surah?: number | null;      
  ayah?: number | null; 
  comment: string;
}

const ScoringPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InitialQuestionScore[]>([
    { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
    { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showComments, setShowComments] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const judgeData = JSON.parse(localStorage.getItem('judge_data') || '{}');

  const { data: roundsResponse } = useQuery({
    queryKey: ['allRounds'],
    queryFn: async () => {
      const response = await api.get('/judges/rounds');
      return response.data;
    },
  });

  const rounds = roundsResponse?.data || [];

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

  const { data: scoredStatus } = useQuery({
    queryKey: ['scored-status', selectedRound],
    queryFn: async () => {
      if (!selectedRound) return {};
      try {
        const response = await api.get(`/judges/scores/judge/${judgeData.id}/round/${selectedRound}/status`);
        const statusMap: {[key: string]: boolean} = {};
        response.data.data.forEach((item: any) => {
          statusMap[item.candidate_id] = true;
        });
        return statusMap;
      } catch {
        return {};
      }
    },
    enabled: !!selectedRound,
  });

  // Filtrer les candidats par recherche
  const filteredCandidates = candidates.filter((candidate: Candidate) =>
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (rounds.length > 0 && !selectedRound) {
      const activeRound = rounds.find((r: any) => r.is_active);
      if (activeRound) {
        setSelectedRound(activeRound.id);
      } else if (rounds.length > 0) {
        setSelectedRound(rounds[0].id);
      }
    }
  }, [rounds, selectedRound]);

  const submitScoresMutation = useMutation({
    mutationFn: ({ candidateId, roundId, questions }: { 
      candidateId: string; 
      roundId: string; 
      questions: InitialQuestionScore[] 
    }) => {
      const apiQuestions: any[] = questions.map(q => ({
        recitation: q.recitation || 0,
        siffat: q.siffat || 0,
        makharij: q.makharij || 0,
        minorError: q.minorError || 0,
        surah: q.surah || null,
        ayah: q.ayah || null,
        comment: q.comment
      }));
      return scoreService.submit(candidateId, roundId, apiQuestions);
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || 'Scores enregistrés avec succès!', {
        icon: '✅',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['judge-candidates', selectedRound] });
      
      const currentIndex = candidates.findIndex((c: Candidate) => c.id === selectedCandidate?.id);
      if (currentIndex < candidates.length - 1) {
        handleCandidateSelect(candidates[currentIndex + 1]);
      } else {
        setSelectedCandidate(null);
        toast('🏆 Tous les candidats ont été notés!', { duration: 4000 });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      toast.error(message);
      console.error('Erreur soumission scores:', error);
    },
  });

  const getScoreColor = (value: number | null, max: number, isSelected: boolean = false) => {
    if (value === null) {
      return isSelected 
        ? 'bg-emerald-600 ring-4 ring-emerald-200 ring-offset-4 scale-105 shadow-2xl border-2 border-white text-white' 
        : 'bg-white hover:bg-emerald-50 text-gray-700 border-2 border-emerald-300';
    }
    
    const percentage = (value / max) * 100;
    
    let baseColor = '';
    if (percentage === 100) baseColor = 'bg-emerald-600 text-white';
    else if (percentage >= 75) baseColor = 'bg-emerald-500 text-white';
    else if (percentage >= 50) baseColor = 'bg-amber-500 text-white';
    else if (percentage >= 25) baseColor = 'bg-amber-400 text-white';
    else if (percentage > 0) baseColor = 'bg-amber-300 text-gray-800';
    else baseColor = 'bg-rose-400 text-white';
    
    if (isSelected) {
      return `${baseColor} ring-4 ring-emerald-200 ring-offset-4 scale-105 shadow-2xl border-2 border-white font-bold z-10 relative`;
    }
    
    return `${baseColor} hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-md border-2 border-white/50`;
  };

  const recitationOptions = [
    { value: 2, label: '2' },
    { value: 1.5, label: '1.5' },
    { value: 1, label: '1' },
    { value: 0, label: '0' },
  ];

  const siffatOptions = [
    { value: 1, label: '1' },
    { value: 0.75, label: '0.75' },
    { value: 0.5, label: '0.5' },
    { value: 0, label: '0' },
  ];

  const makharijOptions = [
    { value: 2, label: '2' },
    { value: 1.5, label: '1.5' },
    { value: 1, label: '1' },
    { value: 0, label: '0' },
  ];

  const minorErrorOptions = [
    { value: 1, label: '1' },
    { value: 0.75, label: '0.75' },
    { value: 0.5, label: '0.5' },
    { value: 0, label: '0' },
  ];

  const calculateQuestionTotal = (question: InitialQuestionScore) => {
    return (question.recitation || 0) + (question.siffat || 0) + (question.makharij || 0) + (question.minorError || 0);
  };

  const calculateTotalScore = () => {
    return questions.reduce((sum, q) => sum + calculateQuestionTotal(q), 0);
  };

  const getScoreDisplayColor = (score: number | null, max: number) => {
    if (score === null) return 'text-gray-500 bg-white border-gray-300';
    const percentage = (score / max) * 100;
    if (percentage === 100) return 'text-emerald-700 bg-white border-emerald-300';
    if (percentage >= 75) return 'text-emerald-600 bg-white border-emerald-300';
    if (percentage >= 50) return 'text-amber-700 bg-white border-amber-300';
    if (percentage >= 25) return 'text-amber-600 bg-white border-amber-300';
    if (percentage > 0) return 'text-amber-600 bg-white border-amber-300';
    return 'text-rose-600 bg-white border-rose-300';
  };

  const isQuestionScored = (question: InitialQuestionScore) => {
    return (
      question.recitation !== null &&
      question.siffat !== null &&
      question.makharij !== null &&
      question.minorError !== null
    );
  };

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
      { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
      { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
    ]);
  };

  const handleCandidateSelect = async (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCurrentQuestion(0);
    setIsLoadingScores(true);
    
    try {
      const response = await scoreService.getJudgeScores(
        candidate.id, 
        selectedRound!, 
        judgeData.id
      );      
      
      if (response?.data && response.data.length > 0) {
        const judgeScores = response.data.filter(
          (score: any) => score.judge_id === judgeData.id
        );
        
        if (judgeScores.length > 0) {
          const loadedQuestions: InitialQuestionScore[] = [
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
          ];
          
          judgeScores.forEach((score: any) => {
            const index = score.question_number - 1;
            if (index >= 0 && index < 5) {
              loadedQuestions[index] = {
                recitation: score.recitation_score ? parseFloat(score.recitation_score) : null,
                siffat: score.siffat_score ? parseFloat(score.siffat_score) : null,
                makharij: score.makharij_score ? parseFloat(score.makharij_score) : null,
                minorError: score.minor_error_score ? parseFloat(score.minor_error_score) : null,
                surah: score.surah_number ? parseInt(score.surah_number) : null,
                ayah: score.ayah_number ? parseInt(score.ayah_number) : null,
                comment: score.comment || ''
              };
            }
          });
          
          setQuestions(loadedQuestions);
          toast.success('Notes existantes chargées', { icon: '📋' });
        } else {
          setQuestions([
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
            { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
          ]);
        }
      } else {
        setQuestions([
          { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
          { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
          { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
          { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
          { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
        ]);
      }
    } catch (error) {
      setQuestions([
        { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
        { recitation: null, siffat: null, makharij: null, minorError: null, surah: null, ayah: null, comment: '' },
      ]);
    } finally {
      setIsLoadingScores(false);
    }
  };

  const handleSaveScores = async () => {
    if (!selectedCandidate || !selectedRound) {
      toast.error('Veuillez sélectionner un candidat');
      return;
    }

    if (!currentRound?.is_active) {
      toast.error('Ce tour n\'est pas actif. Impossible de noter.');
      return;
    }

    const hasUnscoredQuestions = questions.some(q => !isQuestionScored(q));

    if (hasUnscoredQuestions) {
      toast.error('Veuillez noter toutes les questions');
      return;
    }

    const totalScore = calculateTotalScore();
    if (totalScore === 0) {
      const confirmed = window.confirm(
        'Le score total est 0. Êtes-vous sûr de vouloir enregistrer ce score?\n\n' +
        'Si c\'est une erreur, cliquez sur "Annuler" et vérifiez les notes.\n' +
        'Si le candidat a vraiment eu 0, cliquez sur "OK".'
      );
      if (!confirmed) return;
    }

    submitScoresMutation.mutate({
      candidateId: selectedCandidate.id,
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

  const handleNextQuestion = () => {
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (!judgeData.id) {
    navigate('/login');
    return null;
  }

  // Obtenir la sourate sélectionnée pour la question courante
  const selectedSurah = questions[currentQuestion]?.surah 
    ? surahs.find(s => s.number === questions[currentQuestion].surah) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white">
      {/* Motifs islamiques très légers */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 text-emerald-200">
          <Moon size={140} strokeWidth={1} />
        </div>
        <div className="absolute bottom-20 right-10 text-emerald-200">
          <StarIcon size={120} strokeWidth={1} />
        </div>
      </div>

      {/* Header islamique */}
      <header className="relative bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-md border-b border-emerald-500 sticky top-0 z-10">
        <div className="relative max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-emerald-100 italic flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  "وَرَتِّلِ الْقُرْآنَ تَرْتِيلا"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Sélecteur de round */}
              <div className="relative group">
                <select
                  value={selectedRound || ''}
                  onChange={(e) => handleRoundChange(e.target.value)}
                  className="appearance-none px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-300 text-gray-800 font-medium pr-10 shadow-md hover:shadow-lg transition-all min-w-[180px]"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <option value="">Choisir un tour</option>
                  {rounds.map((round: any) => (
                    <option key={round.id} value={round.id}>
                      {round.name} {round.is_active ? '⭐' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              
              {/* Infos juge */}
              <div className="text-right bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                <p className="font-medium text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {judgeData.name}
                </p>
                <p className="text-xs text-emerald-100">{judgeData.code}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2.5 text-white/90 hover:bg-emerald-600 rounded-lg transition-all hover:scale-105"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {!selectedRound ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-2xl mx-auto">
            <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-amber-100 rounded-full flex items-center justify-center border-4 border-emerald-200 shadow-lg">
              <Moon className="w-14 h-14 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Bienvenue {judgeData.name}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto text-lg">
              Veuillez sélectionner un tour pour commencer l'évaluation
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar des candidats */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <Users className="w-5 h-5" />
                    Candidats
                  </h3>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full border border-emerald-200">
                    {filteredCandidates.length}
                  </span>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 text-gray-800 placeholder-gray-400 shadow-sm"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>

                {/* Liste des candidats */}
                {isLoadingCandidates ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun candidat trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredCandidates.map((candidate: Candidate) => {
                      const isScored = scoredStatus?.[candidate.id] || false;
                      return (
                        <button
                          key={candidate.id}
                          onClick={() => handleCandidateSelect(candidate)}
                          className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                            selectedCandidate?.id === candidate.id
                              ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-400 shadow-md'
                              : isScored
                              ? 'bg-white border-gray-200 hover:bg-emerald-50'
                              : 'bg-white border-gray-200 hover:bg-emerald-50'
                          }`}
                        >
                          <div className="font-medium text-gray-800 text-base" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            {candidate.name}
                          </div>
                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full border border-gray-200">
                              {candidate.registration_number}
                            </span>
                            {isScored && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                                <span className="text-xs text-emerald-600">Noté</span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Zone de notation */}
            <div className="lg:col-span-3">
              {!selectedCandidate ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-16 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-amber-100 rounded-full flex items-center justify-center border-4 border-emerald-200 shadow-lg">
                    <Award className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {currentRound?.name}
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Sélectionnez un candidat pour commencer l'évaluation
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Barre d'info candidat avec navigation */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md border-2 border-white">
                          <User className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            {selectedCandidate.name}
                          </h2>
                          <div className="flex gap-3 mt-1.5">
                            <span className="text-sm text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-200">
                              {selectedCandidate.registration_number}
                            </span>
                            {selectedCandidate.category_name && (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm border border-emerald-200">
                                {selectedCandidate.category_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right bg-white px-4 py-2 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">Question</p>
                          <p className="text-2xl font-semibold text-gray-800">
                            {currentQuestion + 1}/5
                          </p>
                        </div>

                        <div className="flex gap-2">
                          
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progression des questions avec flèches */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-base font-medium text-gray-700">Progression des questions</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handlePrevQuestion}
                          disabled={currentQuestion === 0}
                          className="p-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-emerald-50 disabled:opacity-30 transition-all"
                          title="Question précédente"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="text-gray-700 font-medium">Q{currentQuestion + 1}/5</span>
                        <button
                          onClick={handleNextQuestion}
                          disabled={currentQuestion === 4}
                          className="p-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-emerald-50 disabled:opacity-30 transition-all"
                          title="Question suivante"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentQuestion(idx)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${
                            currentQuestion === idx
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-600 shadow'
                              : isQuestionScored(questions[idx])
                              ? 'bg-white text-gray-800 border-emerald-300 hover:bg-emerald-50'
                              : 'bg-white text-gray-600 border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          Q{idx + 1}
                        </button>
                      ))}
                    </div>
                    
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${((currentQuestion + 1) / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Grille de notation */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
                    {isLoadingScores ? (
                      <div className="text-center py-16">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 text-base">Chargement des notes...</p>
                      </div>
                    ) : (
                      <>
                        

                        {/* SÉLECTION DE LA SOURATE ET DU VERSET - Optionnel */}
<div className="mb-10 p-6 bg-emerald-50/30 rounded-xl border-2 border-emerald-200">
  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-3 text-lg">
    <Book className="w-5 h-5 text-emerald-600" />
    Passage du Coran - Question {currentQuestion + 1} (optionnel)
  </h4>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Sélecteur de sourate */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Sourate (optionnelle)
      </label>
      <select
        value={questions[currentQuestion].surah || ''}
        onChange={(e) => {
          const newQuestions = [...questions];
          newQuestions[currentQuestion].surah = e.target.value ? parseInt(e.target.value) : null;
          newQuestions[currentQuestion].ayah = null;
          setQuestions(newQuestions);
        }}
        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 text-gray-800"
      >
        <option value="">Non spécifié</option>
        {surahs.map((surah) => (
          <option key={surah.number} value={surah.number}>
            {surah.number}. {surah.name} ({surah.verses} versets)
          </option>
        ))}
      </select>
    </div>
    
    {/* Sélecteur de verset */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Verset (optionnel)
      </label>
      <input
        type="number"
        min="1"
        max={selectedSurah?.verses || 286}
        value={questions[currentQuestion].ayah || ''}
        onChange={(e) => {
          const newQuestions = [...questions];
          newQuestions[currentQuestion].ayah = e.target.value ? parseInt(e.target.value) : null;
          setQuestions(newQuestions);
        }}
        disabled={!questions[currentQuestion].surah}
        placeholder={!questions[currentQuestion].surah 
          ? "Choisir d'abord une sourate" 
          : `Verset (1-${selectedSurah?.verses || 286})`
        }
        className={`w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 text-gray-800 placeholder-gray-400 ${
          !questions[currentQuestion].surah ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
      {selectedSurah && questions[currentQuestion].ayah && (
        <p className="mt-1 text-xs text-emerald-600">
          {selectedSurah.name} - Verset {questions[currentQuestion].ayah}
        </p>
      )}
    </div>
  </div>
  
  {!questions[currentQuestion].surah && (
    <p className="mt-3 text-sm text-gray-500 flex items-center gap-1">
      <AlertCircle size={14} className="text-gray-400" />
      Optionnel - Vous pouvez laisser vide si non applicable
    </p>
  )}
</div>



                        {/* Récitation */}
                        <div className="mb-10">
                          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-3 text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            Récitation / Mémorisation (0-2)
                          </h4>
                          <div className="flex flex-wrap gap-4">
                            {recitationOptions.map((option) => {
                              const isSelected = questions[currentQuestion].recitation === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    const newQuestions = [...questions];
                                    newQuestions[currentQuestion].recitation = option.value;
                                    setQuestions(newQuestions);
                                  }}
                                  className={`px-8 py-4 rounded-xl font-semibold transition-all shadow-md ${
                                    getScoreColor(option.value, 2, isSelected)
                                  }`}
                                  style={{ minWidth: '80px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '1.1rem' }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Siffat */}
                        <div className="mb-10">
                          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-3 text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            Erreur majeure - Siffat (0-1)
                          </h4>
                          <div className="flex flex-wrap gap-4">
                            {siffatOptions.map((option) => {
                              const isSelected = questions[currentQuestion].siffat === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    const newQuestions = [...questions];
                                    newQuestions[currentQuestion].siffat = option.value;
                                    setQuestions(newQuestions);
                                  }}
                                  className={`px-8 py-4 rounded-xl font-semibold transition-all shadow-md ${
                                    getScoreColor(option.value, 1, isSelected)
                                  }`}
                                  style={{ minWidth: '80px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '1.1rem' }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Makharij */}
                        <div className="mb-10">
                          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-3 text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            Erreur majeure - Makharij (0-2)
                          </h4>
                          <div className="flex flex-wrap gap-4">
                            {makharijOptions.map((option) => {
                              const isSelected = questions[currentQuestion].makharij === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    const newQuestions = [...questions];
                                    newQuestions[currentQuestion].makharij = option.value;
                                    setQuestions(newQuestions);
                                  }}
                                  className={`px-8 py-4 rounded-xl font-semibold transition-all shadow-md ${
                                    getScoreColor(option.value, 2, isSelected)
                                  }`}
                                  style={{ minWidth: '80px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '1.1rem' }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Erreur mineure */}
                        <div className="mb-10">
                          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-3 text-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            Erreurs mineures (0-1)
                          </h4>
                          <div className="flex flex-wrap gap-4">
                            {minorErrorOptions.map((option) => {
                              const isSelected = questions[currentQuestion].minorError === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    const newQuestions = [...questions];
                                    newQuestions[currentQuestion].minorError = option.value;
                                    setQuestions(newQuestions);
                                  }}
                                  className={`px-8 py-4 rounded-xl font-semibold transition-all shadow-md ${
                                    getScoreColor(option.value, 1, isSelected)
                                  }`}
                                  style={{ minWidth: '80px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '1.1rem' }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Commentaire */}
                        <div className="mb-8">
                          <button
                            onClick={() => setShowComments(!showComments)}
                            className="text-sm text-gray-600 hover:text-emerald-700 flex items-center gap-1 mb-3"
                          >
                            {showComments ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showComments ? 'Masquer le commentaire' : 'Afficher le commentaire'}
                          </button>
                          
                          {showComments && (
                            <textarea
                              value={questions[currentQuestion].comment}
                              onChange={(e) => {
                                const newQuestions = [...questions];
                                newQuestions[currentQuestion].comment = e.target.value;
                                setQuestions(newQuestions);
                              }}
                              placeholder="Ajouter un commentaire (optionnel)..."
                              className="w-full h-28 px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-300 text-gray-800 placeholder-gray-400 resize-none"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            />
                          )}
                        </div>

                        
                        
                        <button
  onClick={handleSaveScores}
  disabled={
    submitScoresMutation.isPending || 
    !currentRound?.is_active || 
    !questions.every(q => isQuestionScored(q))
  }
  className={`w-full py-5 rounded-xl font-semibold text-xl flex items-center justify-center gap-3 transition-all ${
    currentRound?.is_active && questions.every(q => isQuestionScored(q))
      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:shadow-xl hover:scale-[1.02]'
      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
  }`}
  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
>
  {submitScoresMutation.isPending ? (
    <>
      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
      Enregistrement...
    </>
  ) : (
    <>
      <Save className="w-5 h-5" />
      Enregistrer les notes
    </>
  )}
</button>


                       
                       {questions.some(q => !q.surah) && (
  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
    <AlertCircle size={16} />
    Information : La sourate n'est pas renseignée pour certaines questions
  </div>
)}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Style pour la scrollbar personnalisée */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f0fdf4;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
      `}</style>
    </div>
  );
};

export default ScoringPage;