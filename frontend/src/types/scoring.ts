export interface QuestionScore {
  recitation: number;
  siffat: number;
  makharij: number;
  minorError: number;
  comment: string;
}

export interface Candidate {
  id: number;
  registration_number: string;
  name: string;
  birth_date?: string;
  category: 'Hifz' | 'Tilawa';
  round_id: number;
  status: 'active' | 'eliminated' | 'qualified';
  created_at: string;
}

export interface Judge {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Round {
  id: number;
  name: string;
  order: number;
  is_active: boolean;
  created_at: string;
}