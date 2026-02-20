// src/pages/admin/CandidateForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { ArrowLeft, Save, UserPlus, Info, Trophy } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Round {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
}

const CandidateForm: React.FC = () => {
  const { id } = useParams(); // Pour l'édition si id présent
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [firstRound, setFirstRound] = useState<Round | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    phone: '',
    email: '',
    category_id: '',
    notes: '',
    status: 'active'
  });

  useEffect(() => {
    fetchFormData();
    if (isEditMode) {
      fetchCandidate();
    }
  }, [id]);

  const fetchFormData = async () => {
    try {
      // Récupérer les catégories
      const categoriesRes = await adminService.getAllCategories();
      if (categoriesRes.success) setCategories(categoriesRes.data);
      
      // Récupérer le premier tour (tour #1 par order_index)
      const roundsRes = await adminService.getAllRounds();
      if (roundsRes.success) {
        const rounds = roundsRes.data;
        
        // Trouver le tour avec le plus petit order_index (normalement 1)
        const firstRound = rounds.sort((a: Round, b: Round) => 
          a.order_index - b.order_index
        )[0];
        
        if (firstRound) {
          setFirstRound(firstRound);
          
          // Si c'est une création, on définit le tour automatiquement
          if (!isEditMode) {
            // On prépare le tour_id mais il ne sera pas affiché
            console.log('Candidat sera ajouté au tour:', firstRound.name);
          }
        } else {
          toast.error('Aucun tour disponible. Créez d\'abord un tour.');
        }
      }
    } catch (error) {
      toast.error('Erreur chargement des données');
      console.error(error);
    }
  };

  const fetchCandidate = async () => {
    try {
      const response = await adminService.getCandidateDetails(id!);
      if (response.success) {
        const candidate = response.data;
        
        // Récupérer le tour actuel du candidat
        if (candidate.round_id) {
          const roundRes = await adminService.getRoundDetails(candidate.round_id);
          if (roundRes.success) {
            setCurrentRound(roundRes.data);
          }
        }
        
        setFormData({
          name: candidate.name,
          birth_date: candidate.birth_date?.split('T')[0] || '',
          phone: candidate.phone || '',
          email: candidate.email || '',
          category_id: candidate.category_id || '',
          notes: candidate.notes || '',
          status: candidate.status
        });
      }
    } catch (error) {
      toast.error('Erreur chargement du candidat');
      navigate('/admin/candidates');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstRound) {
      toast.error('Aucun tour disponible. Créez d\'abord un tour.');
      return;
    }
    
    if (!formData.category_id) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }
    
    setLoading(true);

    try {
      // Préparer les données avec le tour_id automatique
      const candidateData = {
        ...formData,
        // Pour la création: utiliser le premier tour
        // Pour l'édition: garder le tour actuel (ne pas le modifier)
        round_id: isEditMode && currentRound ? currentRound.id : firstRound.id
      };
     
      let response;
      if (isEditMode) {
        response = await adminService.updateCandidate(id!, candidateData);
      } else {
        response = await adminService.createCandidate(candidateData);
      }

      if (response.success) {
        toast.success(isEditMode ? 'Candidat mis à jour' : 'Candidat créé');
        navigate('/admin/candidates');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/candidates')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour à la liste
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? 'Modifier le Candidat' : 'Nouveau Candidat'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode ? 'Modifier les informations du candidat' : 'Ajouter un nouveau candidat au concours'}
              </p>
            </div>
          </div>
        </div>

        {/* Information sur le tour */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-800 mb-1">
                {isEditMode ? 'Tour actuel du candidat' : 'Affectation automatique au tour'}
              </h3>
              <div className="flex items-center gap-2">
                <Trophy className="text-blue-600" size={16} />
                {isEditMode && currentRound ? (
                  <span className="text-blue-700">
                    Ce candidat est actuellement dans le <strong>{currentRound.name}</strong> (Tour #{currentRound.order_index})
                  </span>
                ) : firstRound ? (
                  <span className="text-blue-700">
                    Ce candidat sera automatiquement ajouté au <strong>{firstRound.name}</strong> (Tour #{firstRound.order_index})
                  </span>
                ) : (
                  <span className="text-red-600">
                    Aucun tour disponible. Créez d'abord un tour.
                  </span>
                )}
              </div>
              {!isEditMode && firstRound && (
                <p className="text-sm text-blue-600 mt-2">
                  <strong>Note :</strong> Les nouveaux candidats sont toujours ajoutés au premier tour. 
                  Ils passeront aux tours suivants après qualification.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Informations personnelles
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nom complet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Mohamed Alami"
                  required
                />
              </div>

              {/* Date de naissance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="06 00 00 00 00"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="candidat@email.com"
                />
              </div>

              {/* Statut (seulement en édition) */}
              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="active">Actif</option>
                    <option value="qualified">Qualifié</option>
                    <option value="eliminated">Éliminé</option>
                    <option value="disqualified">Disqualifié</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Catégorie */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Informations du concours
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie *
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Chaque candidat doit appartenir à une catégorie spécifique
                </p>
              </div>

              {/* Affichage du tour (lecture seule) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tour
                </label>
                <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  {isEditMode && currentRound ? (
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-gray-500" />
                      <span className="text-gray-700">
                        {currentRound.name} (Tour #{currentRound.order_index})
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        currentRound.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {currentRound.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  ) : firstRound ? (
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-green-500" />
                      <span className="text-gray-700">
                        {firstRound.name} (Tour #{firstRound.order_index})
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        firstRound.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {firstRound.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-red-500">
                      Aucun tour disponible
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {isEditMode 
                    ? 'Le tour ne peut pas être modifié manuellement'
                    : 'Les nouveaux candidats sont automatiquement ajoutés au premier tour'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Notes et observations
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Informations supplémentaires, observations..."
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/candidates')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !firstRound}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {isEditMode ? 'Mettre à jour' : 'Créer le candidat'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateForm;