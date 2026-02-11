import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../api/service';

const LoginPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Veuillez entrer votre code de jury');
      return;
    }

    setLoading(true);
    
    try {
      const response = await authService.login(code.toUpperCase());
      
      // Stocker les données
      localStorage.setItem('judge_token', response.data.token);
      localStorage.setItem('judge_data', JSON.stringify(response.data.judge));
      
      toast.success('Connexion réussie !');
      navigate('/scoring');
      
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur de connexion';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Concours de Récitation du Coran
          </h1>
          <p className="text-gray-600">
            Système de notation - Interface Jury
          </p>
        </div>

        {/* Carte de connexion */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Connexion Jury
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code du jury
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: JURY001"
                className="input-field text-center text-lg font-mono uppercase tracking-wider"
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-500">
                Entrez le code fourni par l'administrateur
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 
                       text-white font-semibold rounded-lg hover:opacity-90 
                       transition-all disabled:opacity-50 flex items-center 
                       justify-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white 
                               border-t-transparent rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Se connecter
                </>
              )}
            </button>
          </form>
  
          {/* Informations */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Instructions importantes
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Ne partagez pas votre code de jury</li>
                  <li>• Enregistrez les scores après chaque candidat</li>
                  <li>• Vérifiez bien les scores avant enregistrement</li>
                  <li>• En cas de problème, contactez l'administrateur</li>
                </ul>
              </div>
            </div>
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
  <p className="text-sm text-gray-600">
    Accès administrateur ?{' '}
    <button
      type="button"
      onClick={() => navigate('/admin/login')}
      className="text-green-600 hover:text-green-700 font-medium"
    >
      Se connecter ici
    </button>
  </p>
</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2024 Concours de Récitation du Coran
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Version 1.0 • Système sécurisé
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;