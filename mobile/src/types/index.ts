// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  AccountRecovery: { email: string };
  EmailVerification: { email: string; userId: number };
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  ModeSelection: undefined;
  Onboarding: { email?: string; phone?: string; userId?: number } | undefined;
  Feed: { highlightPostId?: number; initialPostId?: number; source?: string } | undefined;
  SavedPosts: undefined;
  SearchAthletes: undefined;
  AthleteProfile: { athleteId: number };
  MyGrid: undefined;
  UserGrid: { userId: number; userName?: string };
  Chat: { recipientId: number; recipientName: string };
  AthleteHome: undefined;
  Groups: undefined;
  MyGroups: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: number; groupName: string; isAdmin?: boolean };
  InviteMembers: { groupId: number; groupName: string };
  CreateTraining: { groupId?: number } | undefined;
  // V12.10 - Groups Expanded
  ManageMembers: { groupId: number; groupName: string; userRole: string };
  GroupRanking: { groupId: number; groupName: string; groupType: string };
  GroupChat: { groupId: number; groupName: string };
  CreateFunctionalTraining: { groupId: number; groupName: string; groupType?: string };
  CreateHike: { groupId: number; groupName: string; groupType?: string };
  CreateYogaSession: { groupId: number; groupName: string; groupType?: string };
  CreateFightTraining: { groupId: number; groupName: string; groupType?: string };
  MyAgenda: undefined;
  Agenda: undefined;
  AgendaSettings: undefined;
  GPS: undefined;
  TrainHub: undefined;
  DiscoverTrainings: undefined;
  TrainingDetail: { trainingId: string };
  ActivitySetup: { trainingId?: string };
  LiveTrainingMap: { activityType?: string; mode?: string; goal?: string; targetDistance?: string; targetTime?: string; targetPace?: string; trainingId?: string };
  TrainingSummary: { distance?: string; time?: string; pace?: string; calories?: number; activityType?: string };
  OrganizerHome: undefined;
  EventsList: undefined;
  EventDetail: { eventId: number | string };
  Registration: { eventId: number; categoryId: number; kitId?: number };
  Profile: undefined;
  EditProfile: undefined;
  MyRegistrations: undefined;
  Results: undefined;
  Ranking: undefined;
  CheckIn: undefined;
  Certificates: undefined;
  EventGallery: { eventId?: number; eventName?: string };
  RouteMap: { eventId?: number; eventName?: string; distance?: string };
  Notifications: undefined;
  Settings: undefined;
  Help: undefined;
  Support: undefined;
  Payments: undefined;
  // Team screens
  Teams: undefined;
  TeamDetail: { teamId: number };
  CreateTeam: undefined;
  TeamRegistration: { teamId: number; eventId: number };
  // Organizer screens
  OrganizerEvents: undefined;
  OrganizerMetrics: undefined;
  CreateEvent: undefined;
  EditEvent: { eventId: number };
  EventRegistrations: { eventId: number };
  ManageRegistrations: { eventId?: number; eventName?: string };
  PublishResults: { eventId?: number; eventName?: string };
  Vouchers: undefined;
  Notifications: undefined;
  EventResults: { category?: string; search?: string; filters?: any };
  CreatePost: { groupId?: number } | undefined;
  Comments: { postId: number };
  FollowersList: { userId: number; userName?: string };
  FollowingList: { userId: number; userName?: string };
  PostDetail: { postId: number };
  VideoPlayer: { postId: number; autoplay?: boolean; fullscreen?: boolean };
  ChatList: undefined;
  FollowRequests: undefined;
  GridProfileSetup: { userId: number };
  SuggestFriends: { userId: number };
  SocialNotifications: undefined;
  EditGridBio: undefined;
};

// User types
export type UserMode = 'athlete' | 'organizer';

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  cpf?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefiro_nao_informar' | null;
  city?: string | null;
  state?: string | null;
  role: 'user' | 'admin' | 'organizer';
  // Profile status (BASIC_COMPLETE = onboarding done, INCOMPLETE = needs onboarding)
  profileStatus?: 'INCOMPLETE' | 'BASIC_COMPLETE';
  // Billing status (COMPLETE = has CPF/address, INCOMPLETE = needs to complete on checkout)
  billingStatus?: 'INCOMPLETE' | 'COMPLETE';
  // Billing data (only filled on checkout, never in app)
  address?: string | null;
  zipCode?: string | null;
  country?: string | null;
  // Legacy compatibility
  avatar?: string;
  avatarUrl?: string;
  mode?: UserMode;
}

// Event types - aligned with API
export interface Event {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  eventDate: string;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  city: string;
  state: string;
  address: string | null;
  startLocation: string | null;
  finishLocation: string | null;
  routeCoordinates: { lat: number; lng: number }[] | null;
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  organizerName: string | null;
  organizerContact: string | null;
  checkoutBaseUrl: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'finished';
  featured: boolean;
  organizerId: number;
  createdAt: string;
  updatedAt: string;
  // Legacy compatibility
  date?: string;
  time?: string;
  location?: string;
  distance?: string[];
  price?: number;
  registrationDeadline?: string;
  totalRegistrations?: number;
  maxRegistrations?: number;
  maxParticipants?: number;
}

// Event Category types
export interface EventCategory {
  id: number;
  eventId: number;
  name: string;
  distance: string | null;
  minAge: number | null;
  maxAge: number | null;
  gender: 'male' | 'female' | 'mixed';
  price: string;
  earlyBirdPrice: string | null;
  earlyBirdEndDate: string | null;
  maxParticipants: number | null;
  currentParticipants: number | null;
  startTime: string | null;
}

// Event Kit types
export interface EventKit {
  id: number;
  eventId: number;
  name: string;
  description: string | null;
  items: string[] | null;
  additionalPrice: string;
  sizes: string[] | null;
  available: boolean;
}

// Registration types
export interface Registration {
  id: number;
  userId: number;
  eventId: number;
  categoryId: number;
  kitId: number | null;
  teamId: number | null;
  registeredBy: number | null;
  kitSize: string | null;
  categoryPrice: string;
  kitPrice: string;
  totalPrice: string;
  checkoutToken: string;
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentDate: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'noshow';
  raceNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationWithDetails extends Registration {
  event: Event;
  category: EventCategory;
  kit?: EventKit;
}

// Result types
export interface Result {
  id: number;
  registrationId: number;
  userId: number;
  eventId: number;
  categoryId: number;
  chipTime: number | null;
  gunTime: number | null;
  avgPace: number | null;
  overallRank: number | null;
  categoryRank: number | null;
  genderRank: number | null;
  splits: { distance: number; time: number }[] | null;
  status: 'official' | 'dnf' | 'dq' | 'dns';
  certificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResultWithDetails {
  result: Result;
  event: Event;
  category: EventCategory;
}

// Team types
export interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  isPublic: boolean;
  allowJoinRequests: boolean;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'inactive';
  nickname: string | null;
  jerseyNumber: string | null;
  joinedAt: string | null;
  invitedBy: number | null;
}

export interface TeamWithMembership {
  team: Team;
  membership: TeamMember;
}

export interface TeamMemberWithUser {
  member: TeamMember;
  user: User;
}

export type AppMode = 'athlete' | 'organizer';
