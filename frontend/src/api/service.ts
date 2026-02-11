// src/api/service.ts
import { api } from './client';

// =============================================
// INTERFACES
// =============================================

export interface Judge {
  id: string;
  code: string;
  name: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

export interface Candidate {
  id: string;
  registration_number: string;
  name: string;
  birth_date?: string;
  category_id: string;
  category_name?: string;
  round_id: string;
  status: 'active' | 'eliminated' | 'qualified' | 'disqualified';
  created_at: string;
  judges_count?: number;
  total_score?: number;
  average_per_question?: number;
  original_candidate_id?: string;
  is_original?: boolean;
}

export interface Round {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at?: string;
  candidates_count?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  hizb_count: number;
  min_age?: number;
  max_age?: number;
  created_at?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    judge: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface QuestionScore {
  recitation: number;
  siffat: number;
  makharij: number;
  minorError: number;
  comment: string;
}

export interface ScoreDetail {
  id: string;
  question_number: number;
  recitation_score: number;
  siffat_score: number;
  makharij_score: number;
  minor_error_score: number;
  total_score: number;
  comment: string;
  judge_name: string;
  judge_code: string;
  submitted_at: string;
}

export interface CandidateScoreSummary {
  candidate_id: string;
  candidate_name: string;
  registration_number: string;
  round_id: string;
  round_name: string;
  category_id: string;
  category_name: string;
  judges_count: number;
  total_score: number;
  average_per_question: number;
  final_score: number;
  score_out_of_30: number;
  scores_by_judge: {
    judge_id: string;
    judge_name: string;
    judge_code: string;
    total_score: number;
    average_score: number;
  }[];
  scores_by_question: {
    question_number: number;
    average_score: number;
  }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
}

// =============================================
// SERVICES POUR LES JURYS
// =============================================

export const scoreService = {
  submit: async (candidateId: string, roundId: string, questions: QuestionScore[]) => {
    const response = await api.post(`/scores/candidate/${candidateId}/round/${roundId}`, {
      questions
    });
    return response.data;
  },
  
  getCandidateScores: async (candidateId: string, roundId: string) => {
    const response = await api.get(`/scores/${candidateId}/${roundId}`);
    return response.data;
  },
  
  getRoundResults: async (roundId: string) => {
    const response = await api.get(`/scores/results/${roundId}`);
    return response.data;
  },
};

export const authService = {
  login: async (code: string): Promise<LoginResponse> => {
    const response = await api.post('auth/judge/login', { code });
    return response.data;
  },
};

export const judgeService = {
  getMe: async () => {
    const response = await api.get('/judges/me');
    return response.data;
  },
};

export const candidateService = {
  getAll: async () => {
    const response = await api.get('/candidates');
    return response.data;
  },
  
  create: async (candidate: any) => {
    const response = await api.post('/candidates', candidate);
    return response.data;
  },
};

export const roundService = {
  getAll: async () => {
    const response = await api.get('/rounds');
    return response.data;
  },
  
  getActive: async () => {
    const response = await api.get('/rounds/active');
    return response.data;
  },
  
  activate: async (roundId: string) => {
    const response = await api.put(`/rounds/${roundId}/activate`);
    return response.data;
  },
  
  getNextRound: async (roundId: string) => {
    const response = await api.get(`/rounds/${roundId}/next`);
    return response.data;
  },
  
  getRoundCategories: async (roundId: string) => {
    const response = await api.get(`/rounds/${roundId}/categories`);
    return response.data;
  }
};

// =============================================
// SERVICES ADMIN COMPLETS
// =============================================

export const adminService = {
  // ============ AUTHENTIFICATION ============
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/admin/login', { email, password });
    return response.data;
  },
  
  verifyToken: async () => {
    const response = await api.get('/auth/admin/verify');
    return response.data;
  },
  
  // ============ DASHBOARD ============
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  
  // ============ CANDIDATS ============
  getAllCandidates: async (params?: any) => {
    const response = await api.get('/admin/candidates', { params });
    return response.data;
  },
  
  getCandidateDetails: async (id: string) => {
    const response = await api.get(`/admin/candidates/${id}`);
    return response.data;
  },
  
  createCandidate: async (candidate: any) => {
    const response = await api.post('/admin/candidates', candidate);
    return response.data;
  },
  
  updateCandidate: async (id: string, candidate: any) => {
    const response = await api.put(`/admin/candidates/${id}`, candidate);
    return response.data;
  },
  
  deleteCandidate: async (id: string) => {
    const response = await api.delete(`/admin/candidates/${id}`);
    return response.data;
  },
  
  updateCandidateStatus: async (id: string, status: string) => {
    console.log('📡 [SERVICE] updateCandidateStatus appelée');
    console.log('📡 [SERVICE] Candidat ID:', id);
    console.log('📡 [SERVICE] Nouveau statut:', status);
    console.log('📡 [SERVICE] URL:', `/qualification/candidates/${id}/status`);
    
    try {
      const response = await api.put(`/qualification/candidates/${id}/status`, { status });
      console.log('📡 [SERVICE] Réponse:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SERVICE] Erreur:', error);
      console.error('❌ [SERVICE] Détails erreur:', error.response?.data);
      throw error;
    }
  },
  
  
  getCandidatesByRound: async (roundId: string, categoryId?: string) => {
    const url = categoryId 
      ? `/admin/rounds/${roundId}/candidates?category_id=${categoryId}` 
      : `/admin/rounds/${roundId}/candidates`;
    const response = await api.get(url);
    return response.data;
  },
  
  // ============ SCORES DES CANDIDATS ============
  getCandidateScores: async (candidateId: string, roundId: string) => {
    const response = await api.get(`/admin/candidates/${candidateId}/rounds/${roundId}/scores`);
    return response.data;
  },
  
  getCandidateScoreSummary: async (candidateId: string, roundId: string) => {
    const response = await api.get(`/scores/candidate/${candidateId}/round/${roundId}/summary`);
    return response.data;
  },
  
  getCandidateDetailedScores: async (candidateId: string, roundId: string) => {
    const response = await api.get(`/scores/candidate/${candidateId}/round/${roundId}/summary`);
    return response.data;
  },
  
  // ============ SCORES PAR CATÉGORIE ============
  getCategoryScores: async (roundId: string, categoryId: string) => {
    const response = await api.get(`/scores/round/${roundId}/category/${categoryId}`);
    return response.data;
  },
  
  getScoresByQuestion: async (roundId: string, categoryId: string) => {
    const response = await api.get(`/scores/round/${roundId}/category/${categoryId}/questions`);
    return response.data;
  },
  
  getScoreStatistics: async (roundId: string, categoryId: string) => {
    const response = await api.get(`/scores/round/${roundId}/category/${categoryId}/statistics`);
    return response.data;
  },

  getScoresByRoundCategory: async (roundId: string, categoryId: string) => {
    const response = await api.get(`/scores/round/${roundId}/category/${categoryId}`);
    return response.data;
  },
  
  // ============ JURYS ============
  getAllJudges: async (params?: any) => {
    const response = await api.get('/admin/judges', { params });
    return response.data;
  },
  
  createJudge: async (judge: any) => {
    const response = await api.post('/admin/judges', judge);
    return response.data;
  },
  
  updateJudge: async (id: string, judge: any) => {
    const response = await api.put(`/admin/judges/${id}`, judge);
    return response.data;
  },
  
  deleteJudge: async (id: string) => {
    const response = await api.delete(`/admin/judges/${id}`);
    return response.data;
  },
  
  updateJudgeStatus: async (id: string, is_active: boolean) => {
    const response = await api.put(`/admin/judges/${id}/status`, { is_active });
    return response.data;
  },
  
  generateJudgeCodes: async (data: { count: number; prefix?: string }) => {
    const response = await api.post('/admin/judges/generate', data);
    return response.data;
  },
  
  assignJudgesToCategory: async (roundId: string, categoryId: string, judgeIds: string[]) => {
    const response = await api.post(`/admin/rounds/${roundId}/categories/${categoryId}/judges`, {
      judgeIds
    });
    return response.data;
  },
  
  // ============ CATÉGORIES ============
  getAllCategories: async () => {
    const response = await api.get('/admin/categories');
    return response.data;
  },
  
  createCategory: async (category: any) => {
    const response = await api.post('/admin/categories', category);
    return response.data;
  },
  
  getCategoryCandidates: async (roundId: string, categoryId: string) => {
    const response = await api.get(`/admin/rounds/${roundId}/categories/${categoryId}/candidates`);
    return response.data;
  },
  
  // ============ TOURS ============
  getAllRounds: async () => {
    const response = await api.get('/admin/rounds');
    return response.data;
  },
  
  createRound: async (round: any) => {
    const response = await api.post('/admin/rounds', round);
    return response.data;
  },
  
  updateRound: async (id: string, round: any) => {
    const response = await api.put(`/admin/rounds/${id}`, round);
    return response.data;
  },
  
  toggleRound: async (id: string, is_active: boolean) => {
    const response = await api.put(`/admin/rounds/${id}/toggle`, { is_active });
    return response.data;
  },
  

  getRoundDetails: async (id: string) => {
  console.log('📡 [SERVICE] Récupération détails du tour:', id);
  const response = await api.get(`/admin/rounds/${id}`);
  return response.data;
},
  
  deleteRound: async (id: string) => {
    const response = await api.delete(`/admin/rounds/${id}`);
    return response.data;
  },
  
  getNextRound: async (roundId: string) => {
    const response = await api.get(`/rounds/${roundId}/next`);
    return response.data;
  },
  
  // ============ QUALIFICATION ============
  qualifyCandidate: async (candidateId: string) => {
  console.log('📡 [SERVICE] Appel qualifyCandidate pour:', candidateId);
  
  try {
    const response = await api.post(`/qualification/candidates/${candidateId}/qualify`);
    console.log('📡 [SERVICE] Réponse:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [SERVICE] Erreur:', error);
    console.error('❌ [SERVICE] URL tentée:', `/qualification/candidates/${candidateId}/qualify`);
    throw error;
  }
},

  
  getCandidateHistory: async (candidateId: string) => {
    const response = await api.get(`/qualification/candidates/${candidateId}/history`);
    return response.data;
  },
  
  getRoundCandidatesWithHistory: async (roundId: string) => {
    const response = await api.get(`/qualification/rounds/${roundId}/candidates`);
    return response.data;
  },
  
  qualifyCandidatesBatch: async (roundId: string, candidateIds: string[]) => {
    const response = await api.post(`/qualification/rounds/${roundId}/qualify-batch`, {
      candidateIds
    });
    return response.data;
  },
  
  qualifyCandidatesAuto: async (candidateIds: string[]) => {
    const response = await api.post(`/admin/candidates/qualify-auto`, {
      candidate_ids: candidateIds
    });
    return response.data;
  },

 
  // ============ RAPPORTS ============
  getRoundReport: async (roundId: string) => {
    const response = await api.get(`/admin/reports/round/${roundId}`);
    return response.data;
  },
  
  // ============ EXPORT/IMPORT ============
  exportCandidates: async (roundId: string, format: 'csv' | 'excel' = 'csv') => {
    const response = await api.get(`/admin/export/candidates/${roundId}?format=${format}`);
    return response.data;
  },
  
  exportScores: async (roundId: string, categoryId: string) => {
    const response = await api.get(`/admin/export/scores/${roundId}/${categoryId}`);
    return response.data;
  }
};

export const judgeCandidateService = {
  getActiveCandidates: async () => {
    const response = await api.get('/judges/active-candidates');
    return response.data;
  },
};