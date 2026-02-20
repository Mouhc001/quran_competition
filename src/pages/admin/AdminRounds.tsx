// src/pages/admin/AdminRounds.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { 
  Plus, Trophy, Calendar, CheckCircle, 
  Clock, Users, Settings, ChevronRight,
  Eye, Edit, Trash2, PlayCircle, StopCircle
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
}

const AdminRounds: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRounds();
  }, []);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllRounds();
      
      if (response.success) {
        // Calculer le nombre de candidats pour chaque tour
        const roundsWithStats = await Promise.all(
          response.data.map(async (round: Round) => {
            try {
              const candidatesRes = await adminService.getCandidatesByRound(round.id);
              return {
                ...round,
                candidates_count: candidatesRes.success ? candidatesRes.data.length : 0
              };
            } catch (error) {
              return { ...round, candidates_count: 0 };
            }
          })
        );
        
        setRounds(roundsWithStats);
      }
    } catch (error) {
      toast.error('Erreur chargement des tours');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await adminService.toggleRound(id, !isActive);
      if (response.success) {
        toast.success(`Tour ${!isActive ? 'activé' : 'désactivé'}`);
        fetchRounds();
      }
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

 const handleDeleteRound = async (id: string, name: string) => {
  if (!window.confirm(`Supprimer le tour "${name}" ? Cette action est irréversible.`)) return;
  
  try {
    console.log(`🗑️  [FRONTEND] Tentative suppression tour ${id}`);
    const response = await adminService.deleteRound(id);
    
    if (response.success) {
      toast.success('Tour supprimé avec succès');
      console.log(`🗑️  [FRONTEND] Suppression réussie, rafraîchissement...`);
      
      // Rafraîchir la liste IMMÉDIATEMENT
      fetchRounds();
    } else {
      toast.error(response.message || 'Erreur lors de la suppression');
      console.log(`🗑️  [FRONTEND] Erreur de suppression:`, response.message);
    }
  } catch (error: any) {
    console.error(`🗑️  [FRONTEND] Exception suppression:`, error);
    
    // Afficher le message d'erreur du backend
    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('Erreur lors de la suppression');
    }
  }
};

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredRounds = rounds.filter(round =>
    round.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    round.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Tours</h1>
              <p className="text-gray-600 mt-1">
                Gérez les différents tours du concours de récitation
              </p>
            </div>
            
            <button
              onClick={() => navigate('/admin/rounds/new')}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={20} />
              Nouveau Tour
            </button>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un tour..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total des tours</p>
                <p className="text-3xl font-bold text-gray-900">{rounds.length}</p>
              </div>
              <Trophy className="text-purple-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tour actif</p>
                <p className="text-3xl font-bold text-green-600">
                  {rounds.filter(r => r.is_active).length}
                </p>
              </div>
              <PlayCircle className="text-green-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Candidats total</p>
                <p className="text-3xl font-bold text-blue-600">
                  {rounds.reduce((sum, round) => sum + (round.candidates_count || 0), 0)}
                </p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">En attente</p>
                <p className="text-3xl font-bold text-orange-600">
                  {rounds.filter(r => !r.is_active && !r.end_date).length}
                </p>
              </div>
              <Clock className="text-orange-600" size={32} />
            </div>
          </div>
        </div>

        {/* Liste des tours en cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRounds.map((round) => (
            <div 
              key={round.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => navigate(`/admin/rounds/${round.id}`)}
            >
              {/* En-tête de la carte */}
              <div className={`p-6 ${round.is_active ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className={`${round.is_active ? 'text-green-600' : 'text-gray-400'}`} size={24} />
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700">
                        {round.name}
                      </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      round.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : round.end_date 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {round.is_active ? 'Actif' : round.end_date ? 'Terminé' : 'En attente'}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Tour #{round.order_index}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {round.candidates_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">candidats</div>
                  </div>
                </div>
                
                {round.description && (
                  <p className="text-gray-700 mb-4 line-clamp-2">{round.description}</p>
                )}
              </div>
              
              {/* Corps de la carte */}
              <div className="p-6 pt-0">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>Début: {formatDate(round.start_date)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>Fin: {formatDate(round.end_date)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Users size={16} />
                    <span>{round.candidates_count || 0} candidats inscrits</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/rounds/${round.id}`);
                      }}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Voir détails"
                    >
                      <Eye size={18} />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/rounds/${round.id}/edit`);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRound(round.id, round.name);
                      }}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${
                      round.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {round.is_active ? (
                      <>
                        <StopCircle size={16} />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <PlayCircle size={16} />
                        Activer
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Indicateur de clic */}
              <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 group-hover:bg-green-50 transition-colors">
                <div className="flex items-center justify-between text-sm text-gray-600 group-hover:text-green-700">
                  <span>Cliquez pour voir les catégories</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message si aucun tour */}
        {filteredRounds.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun tour créé</h3>
            <p className="text-gray-600 mb-6">
              Commencez par créer votre premier tour du concours
            </p>
            <button
              onClick={() => navigate('/admin/rounds/new')}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              <Plus size={20} />
              Créer le premier tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRounds;