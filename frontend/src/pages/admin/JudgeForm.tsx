import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';

const JudgeForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    is_active: false // Par défaut inactif
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Le nom est requis');
        return;
      }

      const response = await adminService.createJudge(formData);
      
      if (response.success) {
        toast.success('Jury créé avec succès');
        if (response.data.login_code) {
          alert(`Code d'accès généré : ${response.data.login_code}\n\nCopiez ce code pour le donner au jury.`);
        }
        navigate('/admin/judges');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de la création';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/judges')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour à la liste
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            Nouveau Jury
          </h1>
          <p className="text-gray-600 mt-1">
            Ajouter un nouveau jury au concours
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            {/* Nom */}
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
                placeholder="Nom du jury"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (optionnel)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            </div>

            {/* Statut */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-5 w-5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Activer immédiatement l'accès
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    Si coché, le jury pourra se connecter immédiatement avec son code.
                    Sinon, vous devrez l'activer manuellement plus tard.
                  </p>
                </div>
              </label>
            </div>

            {/* Information sur le code */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Comment ça marche ?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Un code unique sera automatiquement généré</li>
                <li>• Le jury se connectera uniquement avec ce code</li>
                <li>• Le code sera affiché après la création</li>
                <li>• Copiez-le et communiquez-le au jury</li>
              </ul>
            </div>

            {/* Boutons */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/judges')}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Créer le jury
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JudgeForm;