export interface Question {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    visualPrompt: string;
    hint: string;
    explanation: string;
    imageData?: string;
}

export interface GameConfig {
    topic: string;
    audience: string;
    count: number;
    timerSeconds: number;
    difficulty: string;
}

export interface Adventure {
    id: string;
    topic: string;
    audience: string;
    created_at: string;
    play_count: number;
    daily_plays: Record<string, number>;
    completions: number;
    total_score: number;
    is_featured: boolean;
    config: GameConfig;
    questions: Question[];
    thumbnail_url?: string;
    user_id?: string;
}

export type AppState = 'setup' | 'generating' | 'start_screen' | 'playing' | 'summary' | 'error' | 'admin_login' | 'admin_dashboard' | 'profile';

export type SoundType = 'click' | 'correct' | 'wrong' | 'hint' | 'success';

export interface UserStats {
    total_users: number;
    new_users_today: number;
}

export interface AdminUser {
    id: string;
    email: string;
    last_sign_in_at: string;
    created_at: string;
    adventure_count: number;
    total_play_count: number;
}

export interface SystemLog {
    id: string;
    severity: 'info' | 'warning' | 'error';
    component: string;
    message: string;
    created_at: string;
}
