import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User as ApiUser } from '../services/api';

type AppMode = 'athlete' | 'organizer';

// User type for the app context
interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  cpf?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  bloodType?: string | null;
  healthInfo?: string | null;
  role?: string;
  gridBio?: string | null;
  athleteCategory?: 'PRO' | 'AMATEUR' | 'COACH' | null;
  sports?: string[] | string | null;
}

interface Team {
  id: number;
  name: string;
  logo?: string | null;
  adminId?: number;
  memberCount?: number;
}

interface TeamWithMembership extends Team {
  role: 'admin' | 'member';
}

interface CreatedEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  image: string | null;
  description: string;
  shortDescription: string;
  eventType: string;
  categories: any[];
  totalSpots: number;
  registeredCount: number;
  status: 'draft' | 'open' | 'closed';
}

interface AppContextData {
  user: User | null;
  mode: AppMode;
  isLoading: boolean;
  isAuthenticated: boolean;
  teams: TeamWithMembership[];
  selectedTeam: Team | null;
  createdEvents: CreatedEvent[];
  activeTraining: boolean;
  setActiveTraining: (active: boolean) => void;
  logout: () => Promise<void>;
  login: (email: string, password: string, otpUserData?: any) => Promise<boolean>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  setMode: (mode: AppMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  selectTeam: (team: Team | null) => void;
  openLogin: () => void;
  addCreatedEvent: (event: CreatedEvent) => void;
  updateUser: (userData: Partial<User>) => void;
  setUser: (user: User | null) => void;
  setUserMode: (mode: AppMode) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  photoUrl?: string;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setModeState] = useState<AppMode>('athlete');
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>([]);
  const [activeTraining, setActiveTraining] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    console.log('[Auth] 🔄 Carregando dados armazenados...');
    try {
      const storedMode = await AsyncStorage.getItem('@souesporte_mode');
      const storedUser = await AsyncStorage.getItem('@souesporte_user');
      
      if (storedMode) {
        setModeState(storedMode as AppMode);
        console.log(`[Auth] 🎯 Modo carregado: ${storedMode}`);
      }
      
      // Restaurar usuário do storage
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          console.log(`[Auth] ✅ Usuário restaurado: ${userData.email} (ID: ${userData.id})`);
          // Carregar times do usuário
          await loadTeams(userData.id);
        } catch (e) {
          console.error('[Auth] ❌ Erro ao parsear usuário armazenado:', e);
          // Limpar dados corrompidos
          await AsyncStorage.removeItem('@souesporte_user');
        }
      } else {
        console.log('[Auth] 👤 Nenhum usuário armazenado - Redirecionando para login');
      }
    } catch (error) {
      console.error('[Auth] ❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTeams(userId?: number) {
    try {
      // Usar o userId passado ou o do estado atual
      const currentUserId = userId || user?.id;
      const myTeams = await api.getMyTeams(currentUserId);
      setTeams(myTeams.map(t => ({
        id: t.team.id,
        name: t.team.name,
        logo: t.team.logoUrl,
        role: t.membership.role as 'admin' | 'member',
      })));
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
    }
  }

  async function login(email: string, password: string, otpUserData?: any): Promise<boolean> {
    try {
      // Se já temos os dados do usuário (login via OTP), usar diretamente
      if (otpUserData && password === 'otp_verified') {
        const userData: User = {
          id: otpUserData.id,
          name: otpUserData.name || '',
          email: otpUserData.email || email,
          avatar: otpUserData.photoUrl || null,
          cpf: otpUserData.cpf || null,
          phone: otpUserData.phone || null,
          birthDate: otpUserData.birthDate || null,
          gender: otpUserData.gender || null,
          street: otpUserData.street || null,
          number: otpUserData.number || null,
          complement: otpUserData.complement || null,
          neighborhood: otpUserData.neighborhood || null,
          city: otpUserData.city || null,
          state: otpUserData.state || null,
          zipCode: otpUserData.zipCode || null,
          emergencyName: otpUserData.emergencyName || null,
          emergencyPhone: otpUserData.emergencyPhone || null,
          bloodType: otpUserData.bloodType || null,
          healthInfo: otpUserData.healthInfo || null,
          role: otpUserData.role,
        };
        
        console.log('OTP Login successful, saving user data:', userData);
        
        setUser(userData);
        await AsyncStorage.setItem('@souesporte_user', JSON.stringify(userData));
        
        // Carregar times
        await loadTeams(userData.id);
        
        return true;
      }
      
      // Login tradicional via email/senha
      const result = await api.loginUser(email, password);
      
      if (result.success && result.user) {
        // Salvar todos os dados do usuário retornados pelo login
        const userData: User = {
          id: result.user.id,
          name: result.user.name || '',
          email: result.user.email || '',
          avatar: result.user.photoUrl || null,
          cpf: result.user.cpf || null,
          phone: result.user.phone || null,
          birthDate: result.user.birthDate || null,
          gender: result.user.gender || null,
          street: result.user.street || null,
          number: result.user.number || null,
          complement: result.user.complement || null,
          neighborhood: result.user.neighborhood || null,
          city: result.user.city || null,
          state: result.user.state || null,
          zipCode: result.user.zipCode || null,
          emergencyName: result.user.emergencyName || null,
          emergencyPhone: result.user.emergencyPhone || null,
          bloodType: result.user.bloodType || null,
          healthInfo: result.user.healthInfo || null,
          role: result.user.role,
        };
        
        console.log('Login successful, saving user data:', userData);
        
        setUser(userData);
        await AsyncStorage.setItem('@souesporte_user', JSON.stringify(userData));
        
        // Carregar times
        await loadTeams(userData.id);
        
        // Registrar push token
        try {
          const { registerForPushNotificationsAsync, savePushTokenToBackend } = await import('../services/pushNotifications');
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await savePushTokenToBackend(pushToken);
          }
        } catch (pushError) {
          console.log('Push notification registration skipped:', pushError);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  }

  async function register(data: RegisterData): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await api.registerUser(data);
      
      if (result.success) {
        return { success: true, message: result.message };
      }
      return { success: false, message: 'Erro ao criar conta' };
    } catch (error: any) {
      console.error('Error registering:', error);
      return { success: false, message: error?.message || 'Erro ao criar conta' };
    }
  }

  async function refreshUser() {
    try {
      const profile = await api.getProfile();
      if (profile) {
        const userData: User = {
          id: profile.id,
          name: profile.name || '',
          email: profile.email || '',
          avatar: profile.photoUrl || null,
          cpf: profile.cpf,
          phone: profile.phone,
          birthDate: profile.birthDate,
          gender: profile.gender,
          city: profile.city,
          state: profile.state,
          country: profile.country || 'Brasil',
          role: profile.role,
          gridBio: profile.gridBio || null,
          athleteCategory: profile.athleteCategory || null,
          sports: profile.sports || null,
        };
        setUser(userData);
        await AsyncStorage.setItem('@souesporte_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }

  async function refreshTeams() {
    await loadTeams();
  }

  function openLogin() {
    console.log('openLogin called');
  }

  async function logout() {
    console.log('[Auth] 🚪 Iniciando logout...');
    try {
      // Remover push token
      try {
        const { clearPushToken } = await import('../services/pushNotifications');
        await api.removePushToken();
        await clearPushToken();
      } catch (pushError) {
        console.log('[Auth] ⚠️ Push token removal skipped:', pushError);
      }
      
      setUser(null);
      setTeams([]);
      setSelectedTeam(null);
      setModeState('athlete');
      await AsyncStorage.removeItem('@souesporte_user');
      await AsyncStorage.removeItem('@souesporte_mode');
      console.log('[Auth] ✅ Logout concluído - Redirecionando para login');
    } catch (error) {
      console.error('[Auth] ❌ Erro no logout:', error);
    }
  }

  async function setMode(newMode: AppMode) {
    await AsyncStorage.setItem('@souesporte_mode', newMode);
    setModeState(newMode);
  }

  async function toggleMode() {
    const newMode = mode === 'athlete' ? 'organizer' : 'athlete';
    await setMode(newMode);
  }

  function selectTeam(team: Team | null) {
    setSelectedTeam(team);
  }

  function addCreatedEvent(event: CreatedEvent) {
    setCreatedEvents(prev => [event, ...prev]);
  }

  function updateUser(userData: Partial<User>) {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      AsyncStorage.setItem('@souesporte_user', JSON.stringify(updatedUser));
    }
  }

  return (
    <AppContext.Provider
      value={{
        user,
        mode,
        isLoading,
        isAuthenticated: !!user,
        teams,
        selectedTeam,
        logout,
        login,
        register,
        setMode,
        toggleMode,
        refreshUser,
        refreshTeams,
        selectTeam,
        openLogin,
        createdEvents,
        addCreatedEvent,
        updateUser,
        setUser,
        setUserMode: setMode,
        activeTraining,
        setActiveTraining,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Alias for backwards compatibility
export const useAuth = useApp;
