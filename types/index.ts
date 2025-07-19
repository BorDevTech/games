// Global type definitions for the games application

export interface GameCard {
  readonly id: number;
  readonly title: string;
  readonly genre: string;
  readonly rating: number;
  readonly players: string;
  readonly image: string;
  readonly price: string;
  readonly description: string;
  readonly implemented?: boolean;
  readonly routeId?: string;
}

export interface FeatureCard {
  readonly icon: React.ReactElement;
  readonly title: string;
  readonly description: string;
}

export interface NewsItem {
  readonly id: number;
  readonly title: string;
  readonly excerpt: string;
  readonly date: string;
  readonly author: string;
  readonly image: string;
  readonly slug?: string;
}

export interface GameSearchResult extends GameCard {
  readonly similarity?: number;
}

export interface User {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly avatar?: string;
  readonly preferences: UserPreferences;
}

export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
  readonly notifications: NotificationSettings;
  readonly accessibility: AccessibilitySettings;
}

export interface NotificationSettings {
  readonly email: boolean;
  readonly push: boolean;
  readonly gameUpdates: boolean;
  readonly community: boolean;
}

export interface AccessibilitySettings {
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly fontSize: 'small' | 'medium' | 'large';
  readonly screenReader: boolean;
}

export interface GameSession {
  readonly id: string;
  readonly gameId: string;
  readonly playerId: string;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly score?: number;
  readonly status: 'active' | 'completed' | 'abandoned';
}

export interface GameRoom {
  readonly id: string;
  readonly gameId: string;
  readonly name: string;
  readonly maxPlayers: number;
  readonly currentPlayers: number;
  readonly isPrivate: boolean;
  readonly settings: GameRoomSettings;
  readonly createdAt: Date;
  readonly status: 'waiting' | 'active' | 'full' | 'finished';
}

export interface GameRoomSettings {
  readonly difficulty?: 'easy' | 'medium' | 'hard';
  readonly timeLimit?: number;
  readonly spectators: boolean;
  readonly customRules: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
}

export interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error?: Error;
  readonly errorInfo?: React.ErrorInfo;
}

// Props interfaces for components
export interface GameCardProps {
  readonly game: GameCard;
  readonly onLike?: (gameId: number) => void;
  readonly onShare?: (game: GameCard) => void;
  readonly isLiked?: boolean;
}

export interface SearchBarProps {
  readonly onSearch: (query: string) => void;
  readonly onResultSelect?: (game: GameCard) => void;
  readonly placeholder?: string;
  readonly ariaLabel?: string;
}

export interface NavigationProps {
  readonly items: NavigationItem[];
  readonly currentPath?: string;
  readonly variant?: 'header' | 'sidebar' | 'footer';
}

export interface NavigationItem {
  readonly label: string;
  readonly href: string;
  readonly icon?: React.ReactElement;
  readonly isExternal?: boolean;
  readonly ariaLabel?: string;
}

export interface ThemeContextValue {
  readonly colorMode: 'light' | 'dark';
  readonly toggleColorMode: () => void;
  readonly accentColor: string;
  readonly setAccentColor: (color: string) => void;
}

// Utility types
export type GameGenre = 
  | 'Action'
  | 'Adventure' 
  | 'RPG'
  | 'Strategy'
  | 'Puzzle'
  | 'Arcade'
  | 'Classic'
  | 'Multiplayer'
  | 'Fantasy'
  | 'Shooter';

export type GameStatus = 'active' | 'inactive' | 'maintenance' | 'coming-soon';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Event types
export interface GameStartEvent {
  readonly gameId: string;
  readonly playerId: string;
  readonly timestamp: Date;
}

export interface GameEndEvent extends GameStartEvent {
  readonly score?: number;
  readonly duration: number;
  readonly reason: 'completed' | 'quit' | 'disconnected' | 'error';
}

export interface SearchEvent {
  readonly query: string;
  readonly results: number;
  readonly selectedResult?: GameCard;
  readonly timestamp: Date;
}