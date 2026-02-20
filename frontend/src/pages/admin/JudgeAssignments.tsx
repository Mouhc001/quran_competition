import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, Users, Award, Filter, CheckCircle, XCircle,
  Download, UserCheck, Star, Target, BarChart, ChevronRight,
  Trophy, Hash, Edit, Loader2, AlertCircle, Plus, Trash2,
  BookOpen, Calendar, User, Layers, Save, RefreshCw
} from 'lucide-react';
import { adminService } from '../../api/service';
import { api } from '../../api/client';

interface Judge {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  hizb_count: number;
  description?: string;
}

interface Round {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
}

interface Assignment {
  category_id: string;
  category_name: string;
  hizb_count: number;
  judges: {
    id: string;
    judge_id: string;
    judge_name: string;
    judge_code: string;
    assigned_at: string;
    assigned_by_name?: string;
  }[];
}

const JudgeAssignments: React.FC = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [selectedJudge, setSelectedJudge] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedRound) {
      fetchAssignments(selectedRound);
    }
  }, [selectedRound]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les tours
      const roundsRes = await api.get('/admin/judge-assignments/rounds');
      if (roundsRes.data.success) {
        setRounds(roundsRes.data.data);
        if (roundsRes.data.data.length > 0) {
          setSelectedRound(roundsRes.data.data[0].id);
        }
      }
      
      // Récupérer les jurys
      const judgesRes = await api.get('/admin/judge-assignments/judges');
      if (judgesRes.data.success) {
        setJudges(judgesRes.data.data);
      }
      
      // Récupérer les catégories
      const categoriesRes = await api.get('/admin/judge-assignments/categories');
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.data);
      }
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (roundId: string) => {
    try {
      const response = await api.get(`/admin/judge-assignments/round/${roundId}`);
      if (response.data.success) {
        setAssignments(response.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement assignations:', error);
      toast.error('Erreur chargement des assignations');
    }
  };

  const handleAssign = async () => {
    if (!selectedRound || !selectedJudge || !selectedCategory) {
      toast.error('Veuillez sélectionner un jury, une catégorie et un tour');
      return;
    }

    // Vérifier si cette assignation existe déjà
    const category = assignments.find(c => c.category_id === selectedCategory);
    if (category && category.judges.some(j => j.judge_id === selectedJudge)) {
      toast.error('Ce jury est déjà assigné à cette catégorie');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/admin/judge-assignments/assign', {
        judgeId: selectedJudge,
        categoryId: selectedCategory,
        roundId: selectedRound
      });

      if (response.data.success) {
        toast.success('Jury assigné avec succès');
        // Rafraîchir les assignations
        fetchAssignments(selectedRound);
        // Réinitialiser la sélection
        setSelectedJudge('');
        setSelectedCategory('');
      } else {
        toast.error(response.data.message || 'Erreur lors de l\'assignation');
      }
    } catch (error: any) {
      console.error('Erreur assignation:', error);
      toast.error(error.response?.data?.message || 'Erreur serveur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (judgeId: string, categoryId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer ce jury de cette catégorie ?')) {
      return;
    }

    try {
      const response = await api.delete('/admin/judge-assignments/remove', {
        data: {
          judgeId,
          categoryId,
          roundId: selectedRound
        }
      });

      if (response.data.success) {
        toast.success('Jury retiré avec succès');
        fetchAssignments(selectedRound);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Filtrer les jurys par recherche
  const filteredJudges = judges.filter(judge =>
    judge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    judge.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Retour au tableau de bord
          </button>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="text-purple-600" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Assignation des Jurys</h1>
                  <p className="text-gray-600 mt-1">
                    Assignez les jurys aux catégories pour chaque tour
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => fetchAssignments(selectedRound)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={18} />
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Sélecteur de tour */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sélectionner un tour
              </label>
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choisir un tour</option>
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.name} {round.is_active ? '⭐' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedRound ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche - Formulaire d'assignation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-green-600" />
                  Nouvelle assignation
                </h2>
                
                {/* Recherche de jury */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechercher un jury
                  </label>
                  <input
                    type="text"
                    placeholder="Nom ou code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                {/* Sélection du jury */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jury <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedJudge}
                    onChange={(e) => setSelectedJudge(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    size={5}
                  >
                    <option value="">Sélectionner un jury</option>
                    {filteredJudges.map((judge) => (
                      <option key={judge.id} value={judge.id}>
                        {judge.name} ({judge.code}) {!judge.is_active ? '(inactif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Sélection de la catégorie */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.hizb_count} Hizb)
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Bouton d'assignation */}
                <button
                  onClick={handleAssign}
                  disabled={!selectedJudge || !selectedCategory || submitting}
                  className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                    selectedJudge && selectedCategory && !submitting
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Assignation...
                    </>
                  ) : (
                    <>
                      <UserCheck size={18} />
                      Assigner le jury
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Colonne droite - Liste des assignations */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Assignations actuelles
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Jurys assignés aux catégories pour ce tour
                  </p>
                </div>

                {assignments.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucune assignation
                    </h3>
                    <p className="text-gray-600">
                      Commencez par assigner des jurys aux catégories
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {assignments.map((category) => (
                      <div key={category.category_id} className="p-6">
                        {/* En-tête de catégorie */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Award className="text-purple-600" size={20} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {category.category_name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {category.hizb_count} Hizb • {category.judges.length} jury(s)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Liste des jurys */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {category.judges.map((judge) => (
                            <div
                              key={judge.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <User size={16} className="text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {judge.judge_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {judge.judge_code}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemove(judge.judge_id, category.category_id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Retirer le jury"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun tour sélectionné
            </h3>
            <p className="text-gray-600">
              Veuillez sélectionner un tour pour voir et gérer les assignations
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JudgeAssignments;