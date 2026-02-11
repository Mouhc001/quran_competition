import React, { useEffect, useState, useCallback } from 'react'; // Ajouter useCallback
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import {
  Users,
  Award,
  ClipboardList,
  BarChart3,
  UserPlus,
  Settings,
  LogOut
} from 'lucide-react';

interface DashboardStats {
  candidates: number;
  judges: number;
  activeRounds: number;
  totalScores: number;
  categories: number;
  recentCandidates: any[];
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Utiliser useCallback pour stabiliser la fonction
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/admin/dashboard');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login');
      } else {
        toast.error('Erreur chargement dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]); // Dépendances de fetchDashboard

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]); // Maintenant fetchDashboard est stable


  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Candidats',
      value: stats?.candidates || 0,
      icon: Users,
      color: 'bg-blue-500',
      route: '/admin/candidates'
    },
    {
      title: 'Jurys',
      value: stats?.judges || 0,
      icon: Award,
      color: 'bg-green-500',
      route: '/admin/judges'
    },
    {
      title: 'Tours Actifs',
      value: stats?.activeRounds || 0,
      icon: ClipboardList,
      color: 'bg-purple-500',
      route: '/admin/rounds'
    },
    {
      title: 'Notes',
      value: stats?.totalScores || 0,
      icon: BarChart3,
      color: 'bg-orange-500',
      route: '/admin/scores'
    },
    {
      title: 'Catégories',
      value: stats?.categories || 0,
      icon: Settings,
      color: 'bg-red-500',
      route: '/admin/categories'
    }
  ];

  const quickActions = [
    {
      title: 'Ajouter Candidat',
      icon: UserPlus,
      action: () => navigate('/admin/candidates/new'),
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Créer Tour',
      icon: ClipboardList,
      action: () => navigate('/admin/rounds/new'),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Générer Codes Jury',
      icon: Award,
      action: () => navigate('/admin/judges/generate'),
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
              <p className="text-gray-600">Gestion du concours</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut size={20} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              onClick={() => navigate(stat.route)}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`${action.color} p-4 rounded-lg text-left hover:opacity-90 transition flex items-center gap-3`}
              >
                <action.icon size={24} />
                <span className="font-medium">{action.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Candidats Récents
            </h2>
            <button
              onClick={() => navigate('/admin/candidates')}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Voir tous →
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Inscription
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats?.recentCandidates?.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {candidate.registration_number}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {candidate.name}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {candidate.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {candidate.round_name}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        candidate.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        candidate.status === 'qualified' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {candidate.status === 'active' ? 'Actif' :
                         candidate.status === 'qualified' ? 'Qualifié' : 'Éliminé'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;