// src/pages/admin/RoundForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { ArrowLeft, Save, Trophy, Lock, Unlock, Hash, AlertCircle } from 'lucide-react';

const RoundForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [roundsCount, setRoundsCount] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order_index: 1,
    is_active: true
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchRound(id);
      setIsEditing(true);
    } else {
      // Pour la création, calculer le prochain order_index
      fetchNextOrderIndex();
    }
  }, [id]);

  // Récupérer le nombre de tours pour déterminer le prochain index
  const fetchNextOrderIndex = async () => {
    try {
      const response = await adminService.getAllRounds();
      if (response.success) {
        const rounds = response.data || [];
        setRoundsCount(rounds.length);
        
        // Le prochain order_index = nombre de tours + 1
        setFormData(prev => ({
          ...prev,
          order_index: rounds.length + 1
        }));
      }
    } catch (error) {
      console.error('Erreur récupération tours:', error);
    }
  };

  const fetchRound = async (roundId: string) => {
    try {
      const response = await adminService.getRoundDetails(roundId);
      if (response.success) {
        const round = response.data;
        setFormData({
          name: round.name || '',
          description: round.description || '',
          order_index: round.order_index || 1,
          is_active: round.is_active || false
        });
        
        if (!round.is_active) {
          setIsReadOnly(true);
        }
      }
    } catch (error) {
      toast.error('Erreur chargement du tour');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'order_index' ? parseInt(value) || 1 : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isReadOnly) {
      toast.error('Ce tour est clôturé et ne peut pas être modifié');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('Le nom du tour est requis');
      return;
    }

    setLoading(true);

    try {
      let response;
      
      if (isEditing && id) {
        // Pour l'édition, on ne modifie pas l'order_index
        const { order_index, ...dataToUpdate } = formData;
        response = await adminService.updateRound(id, dataToUpdate);
      } else {
        // Pour la création
        const roundToCreate = {
          ...formData,
          // Si c'est le premier tour (index 1), on ne met pas à jour automatiquement
          // Les tours suivants devront être remplis avec les qualifiés du précédent
          order_index: formData.order_index
        };
        
        response = await adminService.createRound(roundToCreate);
      }
      
      if (response.success) {
        toast.success(isEditing ? 'Tour mis à jour' : 'Tour créé avec succès');
        navigate('/admin/rounds');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour dupliquer les qualifiés du tour précédent
  const handleCopyQualifiedFromPrevious = async () => {
    if (isEditing || !id) return; // Seulement lors de la création
    
    try {
      const previousOrderIndex = formData.order_index - 1;
      if (previousOrderIndex < 1) {
        toast.error('Aucun tour précédent (ceci est le premier tour)');
        return;
      }

      // Récupérer le tour précédent
      const roundsResponse = await adminService.getAllRounds();
      if (!roundsResponse.success) {
        toast.error('Impossible de récupérer les tours');
        return;
      }

      const previousRound = roundsResponse.data.find(
        (round: any) => round.order_index === previousOrderIndex
      );

      if (!previousRound) {
        toast.error('Tour précédent non trouvé');
        return;
      }

      if (!window.confirm(`Copier tous les candidats qualifiés du tour "${previousRound.name}" vers ce nouveau tour ?`)) {
        return;
      }

      // TODO: Implémenter l'API pour copier les qualifiés
      // const response = await adminService.copyQualifiedToNewRound(previousRound.id, id);
      
      toast.success('Candidats qualifiés copiés avec succès');
      
    } catch (error) {
      console.error('Erreur copie qualifiés:', error);
      toast.error('Erreur lors de la copie des qualifiés');
    }
  };

  const isFirstRound = formData.order_index === 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/rounds')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour aux tours
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trophy className="text-green-600" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Modifier le Tour' : 'Nouveau Tour'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditing ? 'Modifier les informations du tour' : 'Créer un nouveau tour du concours'}
              </p>
            </div>
          </div>

          {/* Avertissement si lecture seule */}
          {isReadOnly && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="text-red-600" size={20} />
                <div>
                  <p className="font-medium text-red-800">Tour clôturé</p>
                  <p className="text-sm text-red-700 mt-1">
                    Ce tour est marqué comme inactif (clôturé). Les résultats sont définitifs et ne peuvent plus être modifiés.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du tour *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isReadOnly 
                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300'
                }`}
                placeholder="Ex: Tour Préliminaire, 1/4 de finale, Demi-finale, Finale..."
                required
              />
            </div>

            {/* Numéro d'ordre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Hash size={16} />
                  <span>Numéro d'ordre</span>
                </div>
              </label>
              <input
                type="number"
                name="order_index"
                value={formData.order_index}
                onChange={handleChange}
                disabled={isReadOnly || isEditing} // Non modifiable en édition
                min="1"
                className={`w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isReadOnly || isEditing
                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300'
                }`}
              />
              <p className="text-sm text-gray-500 mt-1">
                Définit l'ordre des tours. Le tour #1 contient tous les candidats initiaux.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optionnelle)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isReadOnly 
                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300'
                }`}
                placeholder="Description détaillée de ce tour..."
              />
            </div>

            {/* Statut */}
            <div className={`p-4 rounded-lg border ${
              formData.is_active 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleCheckboxChange}
                  disabled={isReadOnly}
                  className={`rounded border-gray-300 text-green-600 focus:ring-green-500 h-5 w-5 ${
                    isReadOnly ? 'cursor-not-allowed' : ''
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    {formData.is_active ? (
                      <>
                        <Unlock className="text-green-600" size={18} />
                        <span className="text-sm font-medium text-gray-700">
                          Tour actif
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="text-red-600" size={18} />
                        <span className="text-sm font-medium text-gray-700">
                          Tour inactif (clôturé)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.is_active 
                      ? 'Les jurys peuvent évaluer les candidats de ce tour. Les résultats peuvent encore être modifiés.'
                      : 'Le tour est clôturé. Les résultats sont définitifs et ne peuvent plus être modifiés.'
                    }
                  </p>
                </div>
              </label>
            </div>

            {/* Information sur le remplissage automatique */}
            {!isEditing && (
              <div className={`p-4 rounded-lg border ${
                isFirstRound 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-purple-50 border-purple-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={
                    isFirstRound ? 'text-blue-600' : 'text-purple-600'
                  } size={20} />
                  <div>
                    <h4 className="font-medium mb-2">
                      {isFirstRound 
                        ? 'Tour Initial (#1)'
                        : `Tour Suivant (#${formData.order_index})`
                      }
                    </h4>
                    <ul className="text-sm space-y-1">
                      {isFirstRound ? (
                        <>
                          <li>• Ce tour contiendra <strong>tous les candidats initiaux</strong></li>
                          <li>• Vous devez inscrire manuellement les candidats dans ce tour</li>
                          <li>• Après qualification, les candidats passeront au tour #2</li>
                        </>
                      ) : (
                        <>
                          <li>• Ce tour sera rempli <strong>automatiquement</strong> avec les candidats qualifiés du tour précédent</li>
                          <li>• Aucune inscription manuelle nécessaire</li>
                          <li>• Pour ajouter des candidats, qualifiez-les dans le tour #{formData.order_index - 1}</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Explications */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Workflow des tours</h4>
              <ol className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs">1</span>
                  <span><strong>Tour #1</strong> : Inscription manuelle de tous les candidats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs">2</span>
                  <span><strong>Notation</strong> : Les jurys notent les candidats du tour actif</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs">3</span>
                  <span><strong>Qualification</strong> : Les candidats avec 3 notes sont qualifiés pour le tour suivant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs">4</span>
                  <span><strong>Tour suivant</strong> : Les qualifiés apparaissent automatiquement dans le prochain tour</span>
                </li>
              </ol>
            </div>

            {/* Boutons */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/rounds')}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Annuler
                </button>
                
                {isReadOnly ? (
                  <button
                    type="button"
                    onClick={() => navigate('/admin/rounds')}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Retour aux tours
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        {isEditing ? 'Mettre à jour' : 'Créer le tour'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoundForm;