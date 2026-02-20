// src/pages/admin/AdminRounds.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { 
  Plus, Trophy, Calendar, CheckCircle, 
  Clock, Users, Settings, ChevronRight,
  Eye, Edit, Trash2, PlayCircle, StopCircle,
  ArrowLeft, Award, BarChart, Sparkles, Layers
} from 'lucide-react';

interface Round {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  candidates_count?: number;
  categories_count?: number;
}

const AdminRounds: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<Round[]>([]);

  // Optimisation : utiliser useCallback pour éviter les recréations de fonction
  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      
      // OPTIMISATION 1: Récupérer tous les tours en une seule requête
      const roundsResponse = await adminService.getAllRounds();
      
      if (!roundsResponse.success) {
        throw new Error('Erreur chargement des tours');
      }

      const roundsData = roundsResponse.data;

      // OPTIMISATION 2: Récupérer toutes les catégories en une seule fois
      const categoriesResponse = await adminService.getAllCategories();
      const allCategories = categoriesResponse.success ? categoriesResponse.data : [];

      // OPTIMISATION 3: Récupérer tous les candidats par tour en parallèle
      const candidatesPromises = roundsData.map((round: Round) => 
        adminService.getCandidatesByRound(round.id).catch(() => ({ success: false, data: [] }))
      );
      
      const candidatesResponses = await Promise.all(candidatesPromises);

      // Fusionner toutes les données
      const roundsWithStats = roundsData.map((round: Round, index: number) => {
        const candidatesData = candidatesResponses[index];
        const candidatesCount = candidatesData.success ? candidatesData.data.length : 0;
        
        // Compter les catégories associées à ce tour
        const categoriesCount = allCategories.filter(
          (cat: any) => cat.round_id === round.id
        ).length;

        return {
          ...round,
          candidates_count: candidatesCount,
          categories_count: categoriesCount
        };
      });
      
      setRounds(roundsWithStats);
    } catch (error) {
      toast.error('Erreur chargement des tours');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  // OPTIMISATION 4: Mémoriser les calculs de stats
  const stats = useMemo(() => {
    const totalCandidates = rounds.reduce((sum, round) => sum + (round.candidates_count || 0), 0);
    const activeRounds = rounds.filter(r => r.is_active).length;
    const completedRounds = rounds.filter(r => !r.is_active && r.end_date).length;
    const upcomingRounds = rounds.filter(r => !r.is_active && !r.end_date).length;
    
    return { totalCandidates, activeRounds, completedRounds, upcomingRounds };
  }, [rounds]);

  // OPTIMISATION 5: Mémoriser les fonctions de callback
  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      const response = await adminService.toggleRound(id, !isActive);
      if (response.success) {
        toast.success(`Tour ${!isActive ? 'activé' : 'désactivé'}`);
        // Mise à jour optimiste de l'UI
        setRounds(prev => prev.map(round => 
          round.id === id ? { ...round, is_active: !isActive } : round
        ));
        // Rafraîchir en arrière-plan
        fetchRounds();
      }
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  }, [fetchRounds]);

  const handleDeleteRound = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Supprimer le tour "${name}" ? Cette action est irréversible.`)) return;
    
    try {
      const response = await adminService.deleteRound(id);
      
      if (response.success) {
        toast.success('Tour supprimé avec succès');
        // Mise à jour optimiste
        setRounds(prev => prev.filter(round => round.id !== id));
      } else {
        toast.error(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  }, []);

  const getStatusBadge = useCallback((round: Round) => {
    if (round.is_active) {
      return {
        label: 'En cours',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: PlayCircle
      };
    }
    if (round.end_date) {
      return {
        label: 'Terminé',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: CheckCircle
      };
    }
    return {
      label: 'À venir',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: Clock
    };
  }, []);

  const getProgressPercentage = useCallback((round: Round) => {
    if (!round.start_date || !round.end_date) return 0;
    
    const start = new Date(round.start_date).getTime();
    const end = new Date(round.end_date).getTime();
    const now = new Date().getTime();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="h-8 bg-gray-200 rounded w-48"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-8">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-6"></div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="p-2 hover:bg-white rounded-xl transition-all duration-200 group"
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft size={24} className="text-gray-600 group-hover:text-green-600 group-hover:-translate-x-1 transition-all" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="text-green-600" size={28} />
              Tours du concours
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {rounds.length} tour{rounds.length > 1 ? 's' : ''} • {stats.activeRounds} actif{stats.activeRounds > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Bouton nouveau tour */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => navigate('/admin/rounds/new')}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-600 transition-all duration-200 shadow-lg shadow-green-200 text-base font-medium"
          >
            <Plus size={20} />
            Nouveau tour
          </button>
        </div>

        {/* Liste des tours en cartes PLUS GRANDES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {rounds
            .sort((a, b) => a.order_index - b.order_index)
            .map((round) => {
              const StatusIcon = getStatusBadge(round).icon;
              const progress = getProgressPercentage(round);
              
              return (
                <div 
                  key={round.id}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-green-200 cursor-pointer"
                  onClick={() => navigate(`/admin/rounds/${round.id}`)}
                >
                  {/* Barre de progression plus visible */}
                  {round.is_active && progress > 0 && progress < 100 && (
                    <div className="h-2 bg-gray-100">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  
                  <div className="p-8">
                    {/* En-tête avec plus d'espace */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${
                          round.is_active 
                            ? 'bg-green-100' 
                            : round.end_date 
                            ? 'bg-blue-100'
                            : 'bg-orange-100'
                        }`}>
                          <Award className={
                            round.is_active 
                              ? 'text-green-600' 
                              : round.end_date 
                              ? 'text-blue-600'
                              : 'text-orange-600'
                          } size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors mb-2">
                            {round.name}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(round).color}`}>
                            <StatusIcon size={14} />
                            {getStatusBadge(round).label}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1">Tour</div>
                        <div className="text-2xl font-bold text-gray-900">#{round.order_index}</div>
                      </div>
                    </div>

                    {/* Stats plus visibles */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Users size={16} className="text-gray-400" />
                          <span className="text-sm">Candidats</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{round.candidates_count || 0}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Layers size={16} className="text-gray-400" />
                          <span className="text-sm">Catégories</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{round.categories_count || 0}</p>
                      </div>
                    </div>

                    {/* Description avec plus d'espace */}
                    {round.description && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {round.description}
                        </p>
                      </div>
                    )}

                    {/* Dates si disponibles */}
                    {(round.start_date || round.end_date) && (
                      <div className="mb-6 flex items-center gap-4 text-sm text-gray-600">
                        {round.start_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-gray-400" />
                            <span>Début: {new Date(round.start_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {round.end_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-gray-400" />
                            <span>Fin: {new Date(round.end_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions avec plus d'espace */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/rounds/${round.id}`);
                          }}
                          className="p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={18} />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/rounds/${round.id}/edit`);
                          }}
                          className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRound(round.id, round.name);
                          }}
                          className="p-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(round.id, round.is_active);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          round.is_active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {round.is_active ? (
                          <>
                            <StopCircle size={16} />
                            Arrêter
                          </>
                        ) : (
                          <>
                            <PlayCircle size={16} />
                            Démarrer
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Indicateur de navigation plus visible */}
                  <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-4 border-t border-gray-200 group-hover:from-green-50 group-hover:to-white transition-colors flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 group-hover:text-green-700">
                      Voir les catégories et candidats
                    </span>
                    <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform group-hover:text-green-600" />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Message si aucun tour */}
        {rounds.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-green-600" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Commencez l'aventure</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Créez votre premier tour pour débuter le concours de récitation
            </p>
            <button
              onClick={() => navigate('/admin/rounds/new')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-600 transition-all duration-200 shadow-lg shadow-green-200 text-lg font-medium"
            >
              <Plus size={22} />
              Créer le premier tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRounds;