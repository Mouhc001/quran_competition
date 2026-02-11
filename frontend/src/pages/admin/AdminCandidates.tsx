import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../../api/service';
import { 
  Search, 
  UserPlus, 
  Filter, 
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Candidate {
  id: string;
  registration_number: string;
  name: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  category_name?: string;
  round_name?: string;
  status: string;
  created_at: string;
  total_score?: number;
  final_score?: number;
}

const AdminCandidates: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    round: 'all',
    category: 'all',
    status: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCandidates();
  }, [pagination.page, filters, search]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search,
        ...filters,
        originals_only: true
      };
      
      const response = await adminService.getAllCandidates(params);
      if (response.success) {
        setCandidates(response.data.candidates);
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      toast.error('Erreur chargement candidats');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce candidat ?')) return;
    
    try {
      const response = await adminService.deleteCandidate(id as any);
      if (response.success) {
        toast.success('Candidat supprimé');
        fetchCandidates();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur suppression');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await adminService.updateCandidateStatus(id as any, newStatus);
      if (response.success) {
        toast.success('Statut mis à jour');
        fetchCandidates();
      }
    } catch (error: any) {
      toast.error('Erreur mise à jour statut');
    }
  };

  if (loading && candidates.length === 0) {
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
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Candidats</h1>
              <p className="text-gray-600 mt-1">
                {pagination.total} candidat{pagination.total !== 1 ? 's' : ''} au total
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/candidates/new')}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <UserPlus size={20} />
              Nouveau Candidat
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="border rounded-lg px-4 py-2"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="qualified">Qualifié</option>
                <option value="eliminated">Éliminé</option>
              </select>

              <button className="flex items-center justify-center gap-2 border rounded-lg px-4 py-2 hover:bg-gray-50">
                <Filter size={20} />
                Plus de filtres
              </button>

              <button className="flex items-center justify-center gap-2 border rounded-lg px-4 py-2 hover:bg-gray-50">
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
                    N° Inscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {candidate.registration_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.name}
                        </div>
                        {candidate.email && (
                          <div className="text-sm text-gray-500">
                            {candidate.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {candidate.category_name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {candidate.round_name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {candidate.final_score?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={candidate.status}
                        onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                        className={`text-sm px-2 py-1 rounded-full border ${
                          candidate.status === 'active' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          candidate.status === 'qualified' ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        <option value="active">Actif</option>
                        <option value="qualified">Qualifié</option>
                        <option value="eliminated">Éliminé</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/admin/candidates/${candidate.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                            <Eye size={18} /> {/* AJOUTEZ CE LUCIDE ICON */}

                        </button>
                        <button
                          onClick={() => navigate(`/admin/candidates/${candidate.id}/edit`)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(candidate.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {pagination.page} sur {pagination.pages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination({...pagination, page: pageNum})}
                        className={`px-3 py-1 border rounded ${
                          pagination.page === pageNum 
                            ? 'bg-green-600 text-white border-green-600' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {candidates.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">Aucun candidat trouvé</div>
              <button
                onClick={() => navigate('/admin/candidates/new')}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Ajouter le premier candidat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCandidates;