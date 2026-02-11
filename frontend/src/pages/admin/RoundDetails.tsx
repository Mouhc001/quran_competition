// src/pages/admin/RoundDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { 
  ArrowLeft, Trophy, Users, Award, 
  CheckCircle, BarChart, Download, 
  UserCheck, Lock, Unlock, ChevronRight,
  Star, Target, Calendar, Hash
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
  updated_at?: string;
}

interface Category {
  id: string;
  name: string;
  hizb_count: number;
  description?: string;
  candidates_count?: number;
  average_score?: number;
  qualified_count?: number;
}

const RoundDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState<Round | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalScored: 0,
    totalQualified: 0,
    overallAverage: 0
  });

  useEffect(() => {
    if (id) {
      fetchRoundDetails();
    }
  }, [id]);

  const fetchRoundDetails = async () => {
    try {
      setLoading(true);
      
      // 1. Récupérer les détails du tour
      const roundResponse = await adminService.getRoundDetails(id!);
      if (roundResponse.success) {
        setRound(roundResponse.data);
      }

      // 2. Récupérer les catégories avec statistiques
      const categoriesResponse = await adminService.getAllCategories();
      if (categoriesResponse.success) {
        const categoriesWithStats = await Promise.all(
          categoriesResponse.data.map(async (category: Category) => {
            // Récupérer les candidats de cette catégorie dans ce tour
            const candidatesRes = await adminService.getCandidatesByRound(id!, category.id);
            const candidatesData = candidatesRes.success ? candidatesRes.data : [];
            const candidatesCount = candidatesData.length;
            
            // Calculer les statistiques
            let averageScore = 0;
            let qualifiedCount = 0;
            let scoredCount = 0;
            
            if (candidatesData.length > 0) {
              // Candidats notés
              const scoredCandidates = candidatesData.filter((c: any) => c.total_score && c.total_score > 0);
              scoredCount = scoredCandidates.length;
              
              // Moyenne des scores
              if (scoredCandidates.length > 0) {
                const totalScore = scoredCandidates.reduce((sum: number, c: any) => sum + (c.total_score || 0), 0);
                averageScore = totalScore / scoredCandidates.length;
              }
              
              // Candidats qualifiés
              qualifiedCount = candidatesData.filter((c: any) => c.status === 'qualified').length;
            }
            
            return {
              ...category,
              candidates_count: candidatesCount,
              average_score: parseFloat(averageScore.toFixed(2)),
              qualified_count: qualifiedCount,
              scored_count: scoredCount
            };
          })
        );
        
        setCategories(categoriesWithStats);
        
        // 3. Calculer les statistiques globales
        const totalCandidates = categoriesWithStats.reduce((sum, cat) => sum + (cat.candidates_count || 0), 0);
        const totalScored = categoriesWithStats.reduce((sum, cat: any) => sum + (cat.scored_count || 0), 0);
        const totalQualified = categoriesWithStats.reduce((sum, cat) => sum + (cat.qualified_count || 0), 0);
        
        // Moyenne générale (pondérée par le nombre de candidats notés)
        const totalWeightedScore = categoriesWithStats.reduce((sum, cat) => {
          return sum + ((cat.average_score || 0) * (cat.scored_count || 0));
        }, 0);
        
        const overallAverage = totalScored > 0 ? totalWeightedScore / totalScored : 0;
        
        setStats({
          totalCandidates,
          totalScored,
          totalQualified,
          overallAverage: parseFloat(overallAverage.toFixed(2))
        });
      }

    } catch (error) {
      toast.error('Erreur chargement des détails');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!round) return;
    
    const confirmMessage = round.is_active 
      ? 'Désactiver ce tour ? Les résultats seront clôturés et non modifiables.'
      : 'Activer ce tour ? Les jurys pourront évaluer les candidats.';
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const response = await adminService.toggleRound(round.id, !round.is_active);
      if (response.success) {
        toast.success(`Tour ${!round.is_active ? 'activé' : 'désactivé'}`);
        fetchRoundDetails();
      }
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleViewCategoryCandidates = (categoryId: string, categoryName: string) => {
    navigate(`/admin/rounds/${id}/categories/${categoryId}`, {
      state: { 
        categoryName,
        roundName: round?.name,
        roundId: id
      }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Tour non trouvé</p>
          <button
            onClick={() => navigate('/admin/rounds')}
            className="mt-4 text-green-600 hover:text-green-700"
          >
            Retour aux tours
          </button>
        </div>
      </div>
    );
  }

  // Afficher la vue lecture seule si le tour est inactif
  if (!round.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/admin/rounds')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft size={20} />
              Retour aux tours
            </button>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Lock className="text-red-600" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{round.name}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      Tour Clôturé
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Hash size={14} />
                      <span>Tour #{round.order_index}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {round.description && (
              <p className="text-gray-700 mb-4 max-w-3xl">{round.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                {round.start_date ? (
                  <span>Début: {formatDate(round.start_date)}</span>
                ) : (
                  <span>Début: Non défini</span>
                )}
              </div>
              {round.end_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>Fin: {formatDate(round.end_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Catégories</p>
                  <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
                </div>
                <Award className="text-gray-600" size={32} />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Candidats</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalCandidates}</p>
                </div>
                <Users className="text-gray-600" size={32} />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Qualifiés</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalQualified}</p>
                </div>
                <CheckCircle className="text-green-600" size={32} />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Moyenne générale</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.overallAverage.toFixed(2)}</p>
                </div>
                <BarChart className="text-orange-600" size={32} />
              </div>
            </div>
          </div>

          {/* Catégories */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Catégories du tour ({categories.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <div 
                  key={category.id}
                  className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {category.hizb_count} Hizb • {category.candidates_count || 0} candidats
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {category.average_score?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-gray-500">moyenne</div>
                    </div>
                  </div>
                  
                  {category.description && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{category.description}</p>
                  )}
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Candidats notés</span>
                      
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Qualifiés</span>
                      <span className="font-medium text-green-600">
                        {category.qualified_count || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">Tour clôturé - consultation uniquement</p>
                    <button
                      onClick={() => handleViewCategoryCandidates(category.id, category.name)}
                      className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <Users size={16} />
                      Voir les candidats
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {categories.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-12 text-center border border-gray-200">
                <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie</h3>
                <p className="text-gray-600 mb-6">
                  Aucune catégorie n'est définie pour ce tour.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vue normale (tour actif)
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/rounds')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Retour aux tours
          </button>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Trophy className="text-green-600" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{round.name}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Tour Actif
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Hash size={14} />
                      <span>Tour #{round.order_index}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {round.description && (
                <p className="text-gray-700 mb-4 max-w-3xl">{round.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  {round.start_date ? (
                    <span>Début: {formatDate(round.start_date)}</span>
                  ) : (
                    <span>Début: Non défini</span>
                  )}
                </div>
                {round.end_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>Fin: {formatDate(round.end_date)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleToggleActive}
                className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Lock size={18} />
                Clôturer le tour
              </button>
              
              <button
                onClick={() => navigate(`/admin/rounds/${id}/edit`)}
                className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Target size={18} />
                Modifier
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Catégories</p>
                <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
              </div>
              <Award className="text-purple-600" size={32} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Toutes les catégories disponibles</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Candidats</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalCandidates}</p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Total des candidats qualifiés du tour précédent</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Qualifiés</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalQualified}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Déjà qualifiés pour le tour suivant</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Moyenne</p>
                <p className="text-3xl font-bold text-orange-600">{stats.overallAverage.toFixed(2)}</p>
              </div>
              <BarChart className="text-orange-600" size={32} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Score moyen des candidats notés</p>
          </div>
        </div>

        {/* Catégories */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Catégories du tour ({categories.length})
            </h2>
            <p className="text-sm text-gray-600">
              Cliquez sur une catégorie pour gérer les candidats
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div 
                key={category.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-md hover:border-green-300 transition-all duration-300 group cursor-pointer"
                onClick={() => handleViewCategoryCandidates(category.id, category.name)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-green-700">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{category.hizb_count} Hizb</span> • {category.candidates_count || 0} candidats
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {category.average_score?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-gray-500">moyenne</div>
                    </div>
                  </div>
                  
                  {category.description && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{category.description}</p>
                  )}
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">Candidats notés</span>
                      </div>
                      <span className="font-medium">
                        <span className="text-gray-400"> / </span>
                        {category.candidates_count || 0}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-yellow-400" />
                        <span className="text-sm text-gray-600">Qualifiés</span>
                      </div>
                      <span className="font-medium text-green-600">
                        {category.qualified_count || 0}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-blue-400" />
                        <span className="text-sm text-gray-600">En attente</span>
                      </div>
                     
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <button className="w-full py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 group-hover:bg-green-100">
                      <span>Voir et gérer les candidats</span>
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
                
                
              </div>
            ))}
          </div>
          
          {categories.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
              <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie avec des candidats</h3>
              <p className="text-gray-600 mb-6">
                Ce tour ne contient pas encore de candidats qualifiés du tour précédent.
              </p>
              <button
                onClick={() => navigate('/admin/rounds')}
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700"
              >
                <ArrowLeft size={16} />
                Retour aux tours
              </button>
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate(`/admin/rounds/${id}/results`)}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left hover:border-purple-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Résultats détaillés</h3>
                <p className="text-sm text-gray-600">Voir les statistiques complètes par catégorie</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => navigate(`/admin/reports/round/${id}`)}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left hover:border-blue-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Download className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Exporter rapport</h3>
                <p className="text-sm text-gray-600">Télécharger les résultats du tour</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/admin/judges')}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left hover:border-green-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Assigner les jurys</h3>
                <p className="text-sm text-gray-600">Gérer les jurys pour ce tour</p>
              </div>
            </div>
          </button>
        </div>

        {/* Information importante */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trophy className="text-blue-600" size={20} />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Comment fonctionne ce tour ?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ce tour contient les candidats <span className="font-semibold">qualifiés du tour précédent</span></li>
                <li>• Cliquez sur une catégorie pour voir et noter les candidats</li>
                <li>• Les candidats notés peuvent être qualifiés pour le tour suivant</li>
                <li>• Un tour actif permet aux jurys d'évaluer les candidats</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundDetails;