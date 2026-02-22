export interface QuizSettings {
  primaryColor: string;
  backgroundColor: string;
  buttonStyle: 'rounded' | 'square';
  logoUrl: string | null;
  logoSize?: 'small' | 'medium' | 'large';
  randomizeAnswers?: boolean;
  startButtonText?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  slug: string;
  is_published: boolean;
  settings: QuizSettings;
  created_at: string;
  updated_at: string;
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  email_content: string | null;
  is_lead: boolean;
  min_score: number;
  display_order: number;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  image_url: string | null;
  display_order: number;
  created_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
  display_order: number;
  created_at: string;
}

export interface AnswerResultWeight {
  id: string;
  answer_id: string;
  result_id: string;
  weight: number;
  created_at: string;
}

export interface User {
  id: string;
  stytch_user_id: string | null;
  google_id: string | null;
  email: string | null;
  name: string | null;
  profile_picture_url: string | null;
  created_at: string;
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  user_id: string | null;
  anonymous_token: string | null;
  status: 'viewed' | 'started' | 'completed';
  entered_at: string;
  started_at: string | null;
  completed_at: string | null;
  is_lead: boolean;
  lead_score: number | null;
  created_at: string;
}

export interface QuizResponse {
  id: string;
  session_id: string;
  question_id: string;
  answer_id: string;
  answered_at: string;
}

export interface SessionResult {
  id: string;
  session_id: string;
  result_id: string;
  score: number;
  is_primary: boolean;
  created_at: string;
}

// Extended types with relations
export interface QuestionWithAnswers extends Question {
  answers: AnswerWithWeights[];
}

export interface AnswerWithWeights extends Answer {
  answer_result_weights: AnswerResultWeight[];
}

export interface QuizWithRelations extends Quiz {
  quiz_results: QuizResult[];
  questions: QuestionWithAnswers[];
}

export interface SessionWithResults extends QuizSession {
  session_results: (SessionResult & { quiz_result: QuizResult })[];
  quiz_responses: QuizResponse[];
  user: User | null;
}

// Analytics types
export interface FunnelData {
  viewed: number;
  started: number;
  completed: number;
  leads: number;
}

export interface AnalyticsData {
  funnel: FunnelData;
  completionsByDate: { date: string; count: number }[];
  resultDistribution: { result: string; count: number }[];
  totalSessions: number;
  conversionRate: number;
}

// Form types for creating/updating
export type CreateQuiz = Pick<Quiz, 'title' | 'description' | 'image_url' | 'slug'> & {
  settings?: Partial<QuizSettings>;
};

export type UpdateQuiz = Partial<CreateQuiz> & {
  is_published?: boolean;
};

export type CreateQuizResult = Pick<QuizResult, 'quiz_id' | 'title' | 'description' | 'image_url'>;

export type CreateQuestion = Pick<Question, 'quiz_id' | 'question_text'>;

export type CreateAnswer = Pick<Answer, 'question_id' | 'answer_text'>;

export type CreateAnswerWeight = Pick<AnswerResultWeight, 'answer_id' | 'result_id' | 'weight'>;
