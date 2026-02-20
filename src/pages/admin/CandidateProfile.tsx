import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { ArrowLeft, Edit, User, Award, Phone, Mail, Calendar } from 'lucide-react';

const CandidateProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [roundResults, setRoundResults] = useState<any[]>([]);

  useEffect(() => {
    fetchCandidateDetails();
  }, [id]);

  const fetchCandidateDetails = async () => {
    try {
      const response = await adminService.getCandidateDetails(id!);
      
      if (response.success) {
        setCandidate(response.data);
        setScores(response.data.scores || []);
        setRoundResults(response.data.roundResults || []);
      } else {
        toast.error('Candidat non trouvé');
        navigate('/admin/candidates');
      }
    } catch (error) {
      toast.error('Erreur chargement du candidat');
      navigate('/admin/candidates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/candidates"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Retour à la liste
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {candidate.name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {candidate.registration_number}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  candidate.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  candidate.status === 'qualified' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {candidate.status === 'active' ? 'Actif' :
                   candidate.status === 'qualified' ? 'Qualifié' :
                   candidate.status === 'eliminated' ? 'Éliminé' : 'Disqualifié'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Link
                to={`/admin/candidates/edit/${id}`}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Edit size={18} />
                Modifier
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations personnelles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <User size={20} />
                Informations personnelles
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Nom complet</label>
                  <p className="text-gray-900 font-medium">{candidate.name}</p>
                </div>
                
                {candidate.birth_date && (
                  <div>
                    <label className="block text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <Calendar size={14} />
                      Date de naissance
                    </label>
                    <p className="text-gray-900">
                      {new Date(candidate.birth_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                
                {candidate.phone && (
                  <div>
                    <label className="block text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <Phone size={14} />
                      Téléphone
                    </label>
                    <p className="text-gray-900">{candidate.phone}</p>
                  </div>
                )}
                
                {candidate.email && (
                  <div>
                    <label className="block text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <Mail size={14} />
                      Email
                    </label>
                    <p className="text-gray-900">{candidate.email}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Catégorie</label>
                  <p className="text-gray-900">{candidate.category_name || 'Non spécifiée'}</p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Tour actuel</label>
                  <p className="text-gray-900">{candidate.round_name || 'Non assigné'}</p>
                  {candidate.round_status && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      candidate.round_status === 'active' ? 'bg-green-100 text-green-800' :
                      candidate.round_status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {candidate.round_status}
                    </span>
                  )}
                </div>
              </div>
              
              {candidate.notes && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <label className="block text-sm text-gray-500 mb-2">Notes</label>
                  <p className="text-gray-700 whitespace-pre-line">{candidate.notes}</p>
                </div>
              )}
            </div>

            {/* Scores */}
            {scores.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <Award size={20} />
                  Scores
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jury</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Récitation</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Siffat</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Makharij</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erreurs</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scores.map((score, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">Question {score.question_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{score.judge_name} ({score.judge_code})</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{score.recitation_score}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{score.siffat_score}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{score.makharij_score}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{score.minor_error_score}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{score.total_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Résultats par tour */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Résultats par tour</h3>
              
              {roundResults.length > 0 ? (
                <div className="space-y-4">
                  {roundResults.map((result, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{result.round_name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          result.qualified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {result.qualified ? 'Qualifié' : 'Non qualifié'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Score total:</span>
                          <span className="ml-2 font-medium">{result.total_score}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Moyenne:</span>
                          <span className="ml-2 font-medium">{result.average_score}</span>
                        </div>
                        {result.rank && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Classement:</span>
                            <span className="ml-2 font-medium">{result.rank}ème</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun résultat disponible</p>
              )}
            </div>

            {/* Infos supplémentaires */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Date d'inscription</span>
                  <p className="text-gray-900">
                    {new Date(candidate.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Dernière modification</span>
                  <p className="text-gray-900">
                    {new Date(candidate.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;