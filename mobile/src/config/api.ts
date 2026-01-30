// API Configuration
// URL base da API - usa variável de ambiente EXPO_PUBLIC_API_URL
// Fallback para IP local padrão se não definida
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.14:3000';

// Log para debug (remover em produção)
console.log('[API Config] EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('[API Config] API_URL:', API_URL);

// Helper para fazer chamadas à API tRPC
export async function trpcCall<T>(
  procedure: string,
  input: Record<string, unknown>,
  method: 'query' | 'mutation' = 'mutation'
): Promise<T> {
  const url = method === 'query'
    ? `${API_URL}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : `${API_URL}/api/trpc/${procedure}`;

  console.log(`[tRPC] Calling: ${url}`);

  const options: RequestInit = {
    method: method === 'query' ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'mutation') {
    options.body = JSON.stringify({ json: input });
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Extract error message from tRPC error format
    const errorMessage = errorData?.error?.json?.message || errorData?.error?.message || 'Erro na requisição';
    console.error(`[tRPC] Error:`, errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (data.error) {
    // Extract error message from tRPC error format
    const errorMessage = data.error?.json?.message || data.error?.message || 'Erro na requisição';
    console.error(`[tRPC] Error:`, errorMessage);
    throw new Error(errorMessage);
  }

  console.log(`[tRPC] Success:`, procedure);
  return data.result?.data?.json || data.result?.data || data;
}

// Funções específicas para autenticação OTP
export async function sendOTP(email: string, isNewAccount: boolean = false): Promise<{ 
  success: boolean; 
  message: string;
  isExistingUser?: boolean;
}> {
  return trpcCall('mobile.sendOTP', { email, isNewAccount });
}

export async function verifyOTP(email: string, code: string): Promise<{
  success: boolean;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    photoUrl: string | null;
    cpf: string | null;
    phone: string | null;
    birthDate: string | null;
    gender: string | null;
  };
}> {
  return trpcCall('mobile.verifyOTP', { email, code });
}

// Função para login tradicional (email + senha)
export async function loginUser(email: string, password: string): Promise<{
  success: boolean;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    photoUrl: string | null;
  };
}> {
  return trpcCall('mobile.loginUser', { email, password });
}


// Funções para novos fluxos de autenticação (V12.9)

// Login Social (Google/Apple/Facebook)
export async function socialLogin(provider: 'google' | 'apple' | 'facebook', token: string, email?: string, name?: string, photoUrl?: string): Promise<{
  success: boolean;
  isNewUser: boolean;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    photoUrl: string | null;
    profileStatus: string | null;
    emailVerified: boolean;
    accountStatus: string;
  };
}> {
  return trpcCall('mobile.socialLogin', { provider, token, email, name, photoUrl });
}

// Enviar e-mail de verificação
export async function sendVerificationEmail(email: string, userId: number): Promise<{ success: boolean; message: string }> {
  return trpcCall('mobile.sendVerificationEmail', { email, userId });
}

// Verificar e-mail com código
export async function verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
  return trpcCall('mobile.verifyEmail', { email, code });
}

// Solicitar recuperação de conta bloqueada
export async function requestAccountRecovery(email: string): Promise<{ success: boolean; message: string }> {
  return trpcCall('mobile.requestAccountRecovery', { email });
}

// Desbloquear conta com código
export async function unlockAccount(email: string, code: string): Promise<{ success: boolean; message: string }> {
  return trpcCall('mobile.unlockAccount', { email, code });
}

// Verificar status da conta
export async function checkAccountStatus(email: string): Promise<{
  exists: boolean;
  accountStatus?: string;
  emailVerified?: boolean;
  loginProvider?: string;
}> {
  return trpcCall('mobile.checkAccountStatus', { email }, 'query');
}

// Função para completar onboarding (salvar dados do cadastro)
export async function completeOnboarding(data: {
  userId: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  birthDate: string; // DD/MM/YYYY
  gender: 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_informar';
  photoUrl?: string;
}): Promise<{
  success: boolean;
  message: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    photoUrl: string | null;
    cpf: string | null;
    phone: string | null;
    birthDate: string | null;
    gender: string | null;
    profileStatus: string | null;
    billingStatus: string | null;
  };
}> {
  return trpcCall('mobile.completeOnboarding', data);
}


// =============================================
// V12.10 - Groups Expanded API Functions
// =============================================

// Função genérica para chamadas de grupos
export async function groupsApiCall<T>(
  procedure: string,
  input: Record<string, unknown>,
  method: 'query' | 'mutation' = 'mutation'
): Promise<T> {
  return trpcCall(`mobile.${procedure}`, input, method);
}

// Obter detalhes do grupo
export async function getGroupById(groupId: number): Promise<any> {
  return trpcCall('mobile.groups.getById', { groupId }, 'query');
}

// Obter membership do usuário no grupo
export async function getGroupMembership(groupId: number): Promise<any> {
  return trpcCall('mobile.groups.getMembership', { groupId }, 'query');
}

// Obter membros do grupo
export async function getGroupMembers(groupId: number): Promise<any[]> {
  return trpcCall('mobile.groups.getMembers', { groupId }, 'query');
}

// Buscar usuários para convidar
export async function searchUsersToInvite(groupId: number, query: string): Promise<any[]> {
  return trpcCall('mobile.groups.searchUsersToInvite', { groupId, query }, 'query');
}

// Convidar usuário para o grupo
export async function inviteUserToGroup(groupId: number, userId: number): Promise<any> {
  return trpcCall('mobile.groups.inviteUser', { groupId, userId });
}

// Atualizar membro do grupo
export async function updateGroupMember(
  groupId: number, 
  userId: number, 
  data: { role?: string; canCreateTraining?: boolean }
): Promise<any> {
  return trpcCall('mobile.groups.updateMember', { groupId, userId, ...data });
}

// Remover membro do grupo
export async function removeGroupMember(groupId: number, userId: number): Promise<any> {
  return trpcCall('mobile.groups.removeMember', { groupId, userId });
}

// Obter ranking do grupo
export async function getGroupRanking(
  groupId: number, 
  modality: string, 
  period: string
): Promise<any> {
  return trpcCall('mobile.groups.getRanking', { groupId, modality, period }, 'query');
}

// Obter treinos do grupo
export async function getGroupTrainings(groupId: number): Promise<any[]> {
  return trpcCall('mobile.groups.getTrainings', { groupId }, 'query');
}

// Participar de treino
export async function joinGroupTraining(
  trainingId: number, 
  trainingType: string, 
  response: string
): Promise<any> {
  return trpcCall('mobile.groups.joinTraining', { trainingId, trainingType, response });
}

// Obter mensagens do chat do grupo
export async function getGroupMessages(groupId: number, limit?: number): Promise<any[]> {
  return trpcCall('mobile.groups.getMessages', { groupId, limit: limit || 50 }, 'query');
}

// Enviar mensagem no chat do grupo
export async function sendGroupMessage(
  groupId: number, 
  content: string, 
  replyToId?: number
): Promise<any> {
  return trpcCall('mobile.groups.sendMessage', { groupId, content, replyToId });
}

// Obter posts do grupo
export async function getGroupPosts(groupId: number): Promise<any[]> {
  return trpcCall('mobile.groups.getPosts', { groupId }, 'query');
}

// Sair do grupo
export async function leaveGroup(groupId: number): Promise<any> {
  return trpcCall('mobile.groups.leave', { groupId });
}

// Criar treino funcional
export async function createFunctionalTraining(data: {
  groupId: number;
  title: string;
  description?: string;
  scheduledAt: string;
  meetingPoint?: string;
  maxParticipants?: number;
  trainingType: string;
  intensity: string;
  estimatedDuration: number;
  exercises?: string[];
  equipment?: string[];
}): Promise<any> {
  return trpcCall('mobile.groups.createFunctionalTraining', data);
}

// Criar caminhada/trilha
export async function createHike(data: {
  groupId: number;
  title: string;
  description?: string;
  scheduledAt: string;
  meetingPoint?: string;
  maxParticipants?: number;
  trailName?: string;
  distance?: number;
  elevationGain?: number;
  difficulty: string;
  terrain?: string;
  estimatedDuration?: number;
}): Promise<any> {
  return trpcCall('mobile.groups.createHike', data);
}

// Criar sessão de yoga
export async function createYogaSession(data: {
  groupId: number;
  title: string;
  description?: string;
  scheduledAt: string;
  meetingPoint?: string;
  maxParticipants?: number;
  yogaStyle: string;
  level: string;
  duration: number;
  focusAreas?: string[];
  bringMat?: boolean;
}): Promise<any> {
  return trpcCall('mobile.groups.createYogaSession', data);
}

// Criar treino de lutas
export async function createFightTraining(data: {
  groupId: number;
  title: string;
  description?: string;
  scheduledAt: string;
  meetingPoint?: string;
  maxParticipants?: number;
  martialArt: string;
  trainingType: string;
  level: string;
  duration: number;
  hasSparring?: boolean;
  requiredEquipment?: string[];
}): Promise<any> {
  return trpcCall('mobile.groups.createFightTraining', data);
}
