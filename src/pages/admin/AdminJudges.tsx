import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { 
  Search, 
  UserPlus, 
  Filter, 
  Download,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Key,
  UserCheck,
  UserX,
  Clock,
  Copy,
  RefreshCw
} from 'lucide-react';

interface Judge {
  id: string;
  code: string;
  name: string;
  email?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

const AdminJudges: React.FC = () => {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchJudges();
  }, [pagination.page, search]);

  const fetchJudges = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined
      };
      
      const response = await adminService.getAllJudges(params);
      if (response.success) {
        setJudges(response.data.judges || []);
        setPagination(response.data.pagination || {
          total: (response.data.judges || []).length,
          page: 1,
          limit: 20,
          pages: 1
        });
      }
    } catch (error: any) {
      toast.error('Erreur chargement des jurys');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce jury ? Cette action est irréversible.')) return;
    
    try {
      const response = await adminService.deleteJudge(id);
      if (response.success) {
        toast.success('Jury supprimé avec succès');
        fetchJudges();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(message);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await adminService.updateJudge(id, { 
        is_active: !currentStatus 
      });
      
      if (response.success) {
        toast.success(`Jury ${!currentStatus ? 'activé' : 'désactivé'}`);
        fetchJudges();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur mise à jour';
      toast.error(message);
    }
  };

  const handleEditName = async (judge: Judge) => {
    const newName = prompt('Nouveau nom du jury :', judge.name);
    
    if (!newName || newName.trim() === judge.name) return;
    
    try {
      const response = await adminService.updateJudge(judge.id, { 
        name: newName.trim() 
      });
      
      if (response.success) {
        toast.success('Nom mis à jour');
        fetchJudges();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de la modification';
      toast.error(message);
    }
  };

  const handleRegenerateCode = async (judge: Judge) => {
    try {
      // Générer un nouveau code côté frontend d'abord
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans O,0,1,I
      let newCode: string = '';
      let attempts = 0;
      
      do {
        let random = '';
        for (let i = 0; i < 6; i++) {
          random += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        newCode = `JURY-${random}`;
        
        // Vérifier si le code existe déjà
        const existing = judges.find(j => j.code === newCode);
        attempts++;
        
        if (!existing || attempts > 10) {
          break;
        }
      } while (true);

      // Mettre à jour avec le nouveau code
      const response = await adminService.updateJudge(judge.id, { 
        code: newCode
      });
      
      if (response.success) {
        // Mettre à jour l'état local immédiatement
        setJudges(prev => prev.map(j => 
          j.id === judge.id ? { ...j, code: newCode } : j
        ));
        
        toast.success('Nouveau code généré !');
        
        // Copier automatiquement le nouveau code dans le presse-papier
        navigator.clipboard.writeText(newCode);
        
        // Afficher une notification avec le code (optionnel, sans popup bloquant)
        toast.success(
          <div>
            <p className="font-semibold">Nouveau code généré !</p>
            <p className="text-sm mt-1 font-mono bg-gray-100 p-1 rounded">
              {newCode}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              (Copié dans le presse-papier)
            </p>
          </div>,
          { duration: 4000 }
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur génération code';
      toast.error(message);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && judges.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Jurys</h1>
              <p className="text-gray-600 mt-1">
                {pagination.total} jury{pagination.total !== 1 ? 's' : ''} au total
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/judges/new')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <UserPlus size={20} />
                Nouveau Jury
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <select className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>

              <button className="flex items-center justify-center gap-2 border rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                <Filter size={20} />
                Plus de filtres
              </button>

              <button className="flex items-center justify-center gap-2 border rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                <Download size={20} />
                Exporter
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {judges.map((judge) => (
                  <tr key={judge.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Key className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {judge.code}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {String(judge.id).substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {judge.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Créé le {new Date(judge.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {judge.email || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(judge.id, judge.is_active)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          judge.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {judge.is_active ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Actif
                          </>
                        ) : (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Inactif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(judge.last_login)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Bouton régénérer code - SANS CONFIRMATION */}
                        <button
                          onClick={() => handleRegenerateCode(judge)}
                          className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Générer un nouveau code"
                        >
                          <RefreshCw size={16} />
                        </button>
                        
                        {/* Bouton copier code */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(judge.code);
                            toast.success('Code copié !');
                          }}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Copier le code actuel"
                        >
                          <Copy size={16} />
                        </button>
                        
                        {/* Bouton modifier nom */}
                        <button
                          onClick={() => handleEditName(judge)}
                          className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors"
                          title="Modifier le nom"
                        >
                          <Edit size={16} />
                        </button>
                        
                        {/* Bouton supprimer */}
                        <button
                          onClick={() => handleDelete(judge.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination et autres parties restent identiques */}
          {/* ... (garde le reste du code inchangé) ... */}
        </div>
      </div>
    </div>
  );
};

export default AdminJudges;