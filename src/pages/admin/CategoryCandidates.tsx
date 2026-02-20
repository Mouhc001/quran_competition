// src/pages/admin/CategoryCandidates.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService, scoreService } from '../../api/service'; // Ajout de scoreService
import { 
  ArrowLeft, Users, Award, Filter, CheckCircle, XCircle,
  Download, UserCheck, Star, Target, BarChart, ChevronRight,
  Trophy, Hash, Edit, Loader2, AlertCircle
} from 'lucide-react';
import { FileText } from 'lucide-react';


interface Candidate {
  id: string;
  registration_number: string;
  name: string;
  category_id: string;
  round_id: string;
  status: 'active' | 'qualified' | 'eliminated';
  total_score?: number;
  judges_count?: number;
  average_per_question?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  hizb_count: number;
}

interface Round {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
}

interface StatusOption {
  value: 'active' | 'qualified' | 'eliminated';
  label: string;
  color: string;
  bgColor: string;
}

const statusOptions: StatusOption[] = [
  { value: 'active', label: 'En cours', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'qualified', label: 'Qualifié', color: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'eliminated', label: 'Éliminé', color: 'text-red-800', bgColor: 'bg-red-100' },
];

const CategoryCandidates: React.FC = () => {
  const { id: roundId, categoryId } = useParams<{ id: string; categoryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [nextRound, setNextRound] = useState<Round | null>(null);
  
  // Récupérer les données du state de navigation
  const { categoryName, roundName } = location.state || {};

  useEffect(() => {
    if (roundId && categoryId) {
      fetchData();
      fetchNextRound();
    }
  }, [roundId, categoryId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (!roundId || !categoryId) {
        toast.error('Paramètres manquants');
        return;
      }

      // 1. Récupérer les candidats avec leurs statuts
      const candidatesRes = await adminService.getRoundCandidatesWithHistory(roundId!);
      
      if (candidatesRes.success) {
        // Filtrer par catégorie
        const filteredCandidates = candidatesRes.data.filter(
          (candidate: any) => candidate.category_id === categoryId
        );
        
        // 2. Récupérer les scores calculés par le back-end
        const scoresRes = await adminService.getScoresByRoundCategory(roundId, categoryId);
        
        if (scoresRes.success && scoresRes.data) {
          // Fusionner les données : statuts depuis candidatesRes, scores depuis scoresRes
          const mergedCandidates = filteredCandidates.map((candidate: any) => {
            // Trouver les scores calculés pour ce candidat
            const candidateScores = scoresRes.data.find(
              (score: any) => score.candidate_id === candidate.id
            );
            
            // Si le candidat a des scores calculés, utiliser ces données
            if (candidateScores) {
              return {
                ...candidate, // Garde le statut, nom, etc.
                total_score: candidateScores.total_score || 0, // Déjà calculé par le back-end
                judges_count: candidateScores.judges_count || 0, // Déjà calculé par le back-end
                average_per_question: candidateScores.average_per_question || 0 // Déjà calculé par le back-end
              };
            } else {
              // Pas de scores pour ce candidat
              return {
                ...candidate,
                total_score: 0,
                judges_count: 0,
                average_per_question: 0
              };
            }
          });
          
          setCandidates(mergedCandidates);
        } else {
          // Si pas de scores, utiliser seulement les candidats
          const candidatesWithDefaultScores = filteredCandidates.map((candidate: any) => ({
            ...candidate,
            total_score: 0,
            judges_count: 0,
            average_per_question: 0
          }));
          
          setCandidates(candidatesWithDefaultScores);
        }
      }
      
      // 3. Récupérer les infos de la catégorie et du tour
      try {
        const categoriesRes = await adminService.getAllCategories();
        const currentCategory = categoriesRes.data.find((cat: any) => cat.id === categoryId);
        setCategory(currentCategory || null);
        
        const roundsRes = await adminService.getAllRounds();
        const currentRound = roundsRes.data.find((r: any) => r.id === roundId);
        setRound(currentRound || null);
      } catch (error) {
        console.warn('Erreur chargement infos tour/catégorie:', error);
      }
      
    } catch (error) {
      console.error('Erreur chargement des données:', error);
      toast.error('Erreur chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextRound = async () => {
    try {
      const response = await adminService.getNextRound(roundId!);
      if (response.success && response.data) {
        setNextRound(response.data);
      } else {
        setNextRound(null);
      }
    } catch (error) {
      console.error('Erreur récupération prochain tour:', error);
      setNextRound(null);
    }
  };

  const handleStatusChange = async (candidateId: string, newStatus: 'active' | 'qualified' | 'eliminated') => {
  console.log('=== FRONTEND: handleStatusChange START ===');
  console.log('candidateId:', candidateId);
  console.log('newStatus:', newStatus);
  console.log('roundId:', roundId);
  console.log('nextRound:', nextRound);
  
  const candidate = candidates.find(c => c.id === candidateId);
  if (!candidate) {
    console.log('❌ Candidat non trouvé dans le state');
    return;
  }

  const oldStatus = candidate.status;
  
  if (newStatus === oldStatus) {
    console.log('⚠️  Même statut, rien à faire');
    return;
  }

  // AJOUT: Confirmation spéciale quand on passe de "qualified" à autre chose
  if (oldStatus === 'qualified' && newStatus !== 'qualified') {
    const confirmDelete = window.confirm(
      `⚠️ Attention !\n\n` +
      `Ce candidat est actuellement qualifié.\n` +
      `Si vous changez son statut en "${newStatus}", le clone dans le tour suivant sera supprimé.\n\n` +
      `Êtes-vous sûr de vouloir continuer ?`
    );
    
    if (!confirmDelete) {
      console.log('❌ Annulé par l\'utilisateur - suppression clones');
      // Revenir à l'ancien statut dans l'interface
      setCandidates(prev => prev.map(c => 
        c.id === candidateId ? { ...c, status: oldStatus } : c
      ));
      return;
    }
  }

  // Confirmation pour la qualification
  if (newStatus === 'qualified') {
    const confirmMessage = nextRound 
      ? `Qualifier ce candidat pour le tour suivant : ${nextRound.name} ?`
      : 'Qualifier ce candidat ?';
    
    console.log('💬 Message de confirmation:', confirmMessage);
    
    if (!window.confirm(confirmMessage)) {
      console.log('❌ Annulé par l\'utilisateur');
      return;
    }
  }

  setUpdatingStatus(candidateId);
  console.log('🔄 Mise à jour en cours...');
  
  try {
    if (newStatus === 'qualified') {
      console.log('📞 Appel API: adminService.qualifyCandidate(', candidateId, ')');
      
      const response = await adminService.qualifyCandidate(candidateId);
      
      console.log('📞 Réponse API:', response);
      
      if (response.success) {
        console.log('✅ Qualification réussie');
        toast.success(response.message || 'Candidat qualifié avec succès');
        
        // Mettre à jour localement
        setCandidates(prev => prev.map(c => 
          c.id === candidateId ? { ...c, status: 'qualified' } : c
        ));
        
        // Rafraîchir les données pour voir les changements
        setTimeout(() => fetchData(), 1000);
      } else {
        console.log('❌ Erreur dans la réponse:', response.message);
        throw new Error(response.message || 'Erreur lors de la qualification');
      }
    } else {
      console.log('📞 Appel API: adminService.updateCandidateStatus(', candidateId, ',', newStatus, ')');
      const response = await adminService.updateCandidateStatus(candidateId, newStatus);
      
      console.log('📞 Réponse API:', response);
      
      if (response.success) {
        console.log('✅ Statut mis à jour');
        
        // Mettre à jour localement
        setCandidates(prev => prev.map(c => 
          c.id === candidateId ? { ...c, status: newStatus } : c
        ));
        
        // Si on passe de "qualified" à autre chose, rafraîchir complètement
        if (oldStatus === 'qualified') {
          toast.success('Statut mis à jour - clone supprimé du tour suivant');
          // Rafraîchir pour être sûr que tout est synchronisé
          setTimeout(() => fetchData(), 1000);
        } else {
          toast.success('Statut mis à jour');
        }
      } else {
        console.log('❌ Erreur dans la réponse:', response.message);
        throw new Error(response.message || 'Erreur lors de la mise à jour');
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur complète:', error);
    console.error('Stack:', error.stack);
    console.error('Réponse API:', error.response?.data);
    
    const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la mise à jour du statut';
    toast.error(errorMessage);
    
    // Revenir à l'ancien statut dans l'interface
    setCandidates(prev => prev.map(c => 
      c.id === candidateId ? { ...c, status: oldStatus } : c
    ));
  } finally {
    console.log('=== FRONTEND: handleStatusChange END ===');
    setUpdatingStatus(null);
  }
};

  const handleQualifyAllScored = async () => {
    const candidatesToQualify = candidates.filter(candidate => 
      candidate.status === 'active' && 
      candidate.judges_count === 3
    );

    if (candidatesToQualify.length === 0) {
      toast.error('Aucun candidat prêt à être qualifié (tous les candidats doivent avoir 3 notes)');
      return;
    }

    if (!window.confirm(`Qualifier ${candidatesToQualify.length} candidat(s) ?`)) {
      return;
    }

    try {
      const candidateIds = candidatesToQualify.map(c => c.id);
      const response = await adminService.qualifyCandidatesAuto(candidateIds);
      
      if (response.success) {
        toast.success(`${candidatesToQualify.length} candidat(s) qualifié(s) avec succès`);
        fetchData();
      } else {
        throw new Error(response.message || 'Erreur lors de la qualification');
      }
    } catch (error: any) {
      console.error('Erreur qualification batch:', error);
      toast.error(error.message || 'Erreur lors de la qualification');
    }
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? `${option.bgColor} ${option.color}` : 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : 'Inconnu';
  };

  const getScoreColor = (score?: number) => {
    if (!score || score === 0) return 'text-gray-500';
    if (score >= 25) return 'text-green-600';      // Excellent (≥25/30)
    if (score >= 20) return 'text-blue-600';       // Bon (20-25)
    if (score >= 15) return 'text-yellow-600';     // Moyen (15-20)
    return 'text-red-600';                         // Faible (<15)
  };

  const getScoreLabel = (score?: number) => {
    if (!score || score === 0) return 'Non noté';
    if (score >= 25) return 'Excellent';
    if (score >= 20) return 'Bon';
    if (score >= 15) return 'Moyen';
    return 'Faible';
  };

  // Calcul des statistiques (faits avec les données déjà calculées par le back-end)
  const calculateStatistics = () => {
    const scoredCandidates = candidates.filter(c => c.total_score && c.total_score > 0);
    const qualifiedCount = candidates.filter(c => c.status === 'qualified').length;
    const activeCount = candidates.filter(c => c.status === 'active').length;
    const eliminatedCount = candidates.filter(c => c.status === 'eliminated').length;
    
    // Calcul simple de la moyenne basé sur les scores déjà calculés par le back-end
    const averageScore = scoredCandidates.length > 0
      ? scoredCandidates.reduce((sum, c) => sum + (c.total_score || 0), 0) / scoredCandidates.length
      : 0;

    const readyToQualify = candidates.filter(c => 
      c.status === 'active' && c.judges_count === 3
    ).length;

    return {
      scoredCount: scoredCandidates.length,
      averageScore,
      qualifiedCount,
      activeCount,
      eliminatedCount,
      readyToQualify
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const actualCategoryName = category?.name || categoryName || 'Catégorie';
  const actualRoundName = round?.name || roundName || 'Tour';
  const stats = calculateStatistics();

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
                  <Award className="text-purple-600" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{actualCategoryName}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Trophy size={16} />
                      <span>{actualRoundName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Hash size={14} />
                      <span>Tour #{round?.order_index}</span>
                    </div>
                    {category?.hizb_count && (
                      <div className="text-gray-600">
                        {category.hizb_count} Hizb
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {category?.description && (
                <p className="text-gray-700 mb-4 max-w-3xl">{category.description}</p>
              )}
              
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="text-gray-600">
                    {candidates.length} candidat(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-gray-600">
                    {stats.scoredCount} noté(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-purple-500" />
                  <span className="text-gray-600">
                    {stats.qualifiedCount} qualifié(s)
                  </span>
                </div>
                {round?.is_active && nextRound && (
                  <div className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-green-500" />
                    <span className="text-green-600 font-medium">
                      Tour suivant : {nextRound.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {round?.is_active && (
              <div className="flex gap-3">
                {stats.readyToQualify > 0 && (
                  <button
                    onClick={handleQualifyAllScored}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  >
                    <Star size={18} />
                    Qualifier {stats.readyToQualify} prêt(s)
                  </button>
                )}
                
                <button className="flex items-center gap-2 border border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50">
                  <Download size={18} />
                  Exporter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Candidats</p>
                <p className="text-3xl font-bold text-gray-900">{candidates.length}</p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prêts à qualifier</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.readyToQualify}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (3 jurys ont noté)
                </p>
              </div>
              <CheckCircle className="text-yellow-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Moyenne</p>
                <p className="text-3xl font-bold text-orange-600">
                  {(stats.averageScore || 0).toFixed(2)}
                </p>
              </div>
              <BarChart className="text-orange-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Qualifiés</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.qualifiedCount}
                </p>
              </div>
              <UserCheck className="text-green-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Éliminés</p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.eliminatedCount}
                </p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        {/* Table des candidats */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* En-tête */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Liste des candidats</h2>
                <p className="text-sm text-gray-600">
                  {round?.is_active 
                    ? 'Modifiez le statut directement depuis la liste. Les candidats qualifiés passeront au tour suivant.'
                    : 'Tour clôturé - consultation uniquement'
                  }
                </p>
                {round?.is_active && stats.readyToQualify > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                    <AlertCircle size={14} />
                    <span>{stats.readyToQualify} candidat(s) peuvent être qualifié(s) (3/3 jurys)</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher un candidat..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jurys
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((candidate) => {
                  const isQualifiable = candidate.status === 'active' && candidate.judges_count === 3;
                  const isUpdating = updatingStatus === candidate.id;
                  
                  return (
                    <tr 
                      key={candidate.id}
                      className={`hover:bg-gray-50 ${
                        isQualifiable ? 'border-l-4 border-l-yellow-400' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{candidate.name}</div>
                          <div className="text-sm text-gray-500">{candidate.registration_number}</div>
                          {isQualifiable && round?.is_active && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600">
                              <CheckCircle size={10} />
                              <span>Prêt à qualifier</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-2xl font-bold ${getScoreColor(candidate.total_score)}`}>
                          {candidate.total_score && candidate.total_score > 0 
                            ? Number(candidate.total_score).toFixed(2) 
                            : '—'
                          }
                        </div>
                        {candidate.total_score && candidate.total_score > 0 && (
                          <>
                            <div className="text-xs text-gray-500">
                              {getScoreLabel(candidate.total_score)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {Number(candidate.average_per_question || 0).toFixed(2)}/6 par question
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-gray-400" />
                          <span className={`font-medium ${
                            candidate.judges_count === 3 ? 'text-green-600' : 'text-gray-700'
                          }`}>
                            {candidate.judges_count || 0}/3
                          </span>
                          {candidate.judges_count === 3 && (
                            <CheckCircle size={14} className="text-green-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <select
                            value={candidate.status}
                            onChange={(e) => handleStatusChange(
                              candidate.id, 
                              e.target.value as 'active' | 'qualified' | 'eliminated'
                            )}
                            disabled={isUpdating}
                            className={`
                              w-40 px-3 py-1.5 rounded-lg border 
                              ${isUpdating ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'bg-white cursor-pointer'}
                              ${getStatusColor(candidate.status)} 
                              border-gray-300 
                              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                              transition-all duration-200
                            `}
                          >
                            {statusOptions.map((option) => (
                              <option 
                                key={option.value} 
                                value={option.value}
                                className={`${option.bgColor} ${option.color}`}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {isUpdating && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-3">
                          <button
onClick={() => navigate(`/admin/candidates/${candidate.id}/scores/${roundId}`, {
  state: {
    candidateName: candidate.name,
    registrationNumber: candidate.registration_number,
    categoryName: category?.name,
    categoryId: categoryId, // <-- Important !
    roundName: round?.name
  }
})}                            className="text-green-600 hover:text-green-800 flex items-center gap-1"
                          >
                            <FileText size={16} />
                            Scores
                          </button>
                          <button
                            onClick={() => navigate(`/admin/candidates/${candidate.id}`)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <ChevronRight size={16} />
                            Profil
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {candidates.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun candidat</h3>
                <p className="text-gray-600 mb-6">
                  Aucun candidat n'est inscrit dans cette catégorie pour ce tour.
                </p>
                <button
                  onClick={() => navigate(`/admin/rounds/${roundId}`)}
                  className="inline-flex items-center gap-2 text-green-600 hover:text-green-700"
                >
                  <ArrowLeft size={16} />
                  Retour au tour
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions supplémentaires */}
        {round?.is_active && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => navigate(`/admin/rounds/${roundId}/categories/${categoryId}/scores`)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md text-left hover:border-purple-300"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Détails des scores</h3>
                  <p className="text-sm text-gray-600">Voir le détail des notes par question</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => navigate(`/admin/judges/assign?round=${roundId}&category=${categoryId}`)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md text-left hover:border-blue-300"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <UserCheck className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Assigner les jurys</h3>
                  <p className="text-sm text-gray-600">Choisir les jurys pour cette catégorie</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={handleQualifyAllScored}
              disabled={stats.readyToQualify === 0}
              className={`p-6 rounded-xl shadow-sm border text-left ${
                stats.readyToQualify > 0
                  ? 'bg-green-50 border-green-200 hover:border-green-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  stats.readyToQualify > 0 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Star className={
                    stats.readyToQualify > 0 ? 'text-green-600' : 'text-gray-400'
                  } size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Qualifier tous les prêts
                  </h3>
                  <p className="text-sm text-gray-600">
                    {stats.readyToQualify > 0
                      ? `${stats.readyToQualify} candidat(s) avec 3/3 notes`
                      : 'Aucun candidat prêt à qualifier'
                    }
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryCandidates;