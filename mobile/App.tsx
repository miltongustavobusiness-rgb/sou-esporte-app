import React, { useState, useEffect, useCallback, Suspense, lazy, ComponentType } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { RootStackParamList } from './src/types';
import { AppProvider } from './src/contexts/AppContext';
import { FiltersProvider } from './src/contexts/FiltersContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { COLORS } from './src/constants/theme';

// Ignorar warnings que não afetam funcionalidade
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// ============================================
// SCREENS CRÍTICAS - Carregamento Estático
// Apenas screens necessárias para o boot inicial
// ============================================
import SplashScreenComponent from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// ============================================
// LAZY LOADING - Screens carregadas sob demanda
// Evita crash no boot do Expo Go
// ============================================

// Helper para criar lazy component com fallback
const lazyScreen = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => lazy(importFn);

// Auth Screens (lazy)
const ForgotPasswordScreen = lazyScreen(() => import('./src/screens/ForgotPasswordScreen'));
const ResetPasswordScreen = lazyScreen(() => import('./src/screens/ResetPasswordScreen'));
const AccountRecoveryScreen = lazyScreen(() => import('./src/screens/AccountRecoveryScreen'));
const EmailVerificationScreen = lazyScreen(() => import('./src/screens/EmailVerificationScreen'));
const ModeSelectionScreen = lazyScreen(() => import('./src/screens/ModeSelectionScreen'));
const OnboardingScreen = lazyScreen(() => import('./src/screens/OnboardingScreen'));

// Feed & Social (CRÍTICO - usa expo-video)
const FeedScreen = lazyScreen(() => import('./src/screens/FeedScreen'));
const CreatePostScreen = lazyScreen(() => import('./src/screens/CreatePostScreen'));
const CommentsScreen = lazyScreen(() => import('./src/screens/CommentsScreen'));
const SavedPostsScreen = lazyScreen(() => import('./src/screens/SavedPostsScreen'));
const PostDetailScreen = lazyScreen(() => import('./src/screens/PostDetailScreen'));
const VideoPlayerScreen = lazyScreen(() => import('./src/screens/VideoPlayerScreen'));

// Groups
const MyGroupsScreen = lazyScreen(() => import('./src/screens/MyGroupsScreen'));
const CreateGroupScreen = lazyScreen(() => import('./src/screens/CreateGroupScreen'));
const GroupDetailScreen = lazyScreen(() => import('./src/screens/GroupDetailScreen'));
const InviteMembersScreen = lazyScreen(() => import('./src/screens/InviteMembersScreen'));
const ManageMembersScreen = lazyScreen(() => import('./src/screens/ManageMembersScreen'));
const GroupRankingScreen = lazyScreen(() => import('./src/screens/GroupRankingScreen'));
const GroupChatScreen = lazyScreen(() => import('./src/screens/GroupChatScreen'));

// Training
const TrainHubScreen = lazyScreen(() => import('./src/screens/TrainHubScreen'));
const DiscoverTrainingsScreen = lazyScreen(() => import('./src/screens/DiscoverTrainingsScreen'));
const CreateTrainingScreen = lazyScreen(() => import('./src/screens/CreateTrainingScreen'));
const TrainingDetailScreen = lazyScreen(() => import('./src/screens/TrainingDetailScreen'));
const ActivitySetupScreen = lazyScreen(() => import('./src/screens/ActivitySetupScreen'));
const LiveTrainingMapScreen = lazyScreen(() => import('./src/screens/LiveTrainingMapScreen'));
const TrainingSummaryScreen = lazyScreen(() => import('./src/screens/TrainingSummaryScreen'));
const CreateFunctionalTrainingScreen = lazyScreen(() => import('./src/screens/CreateFunctionalTrainingScreen'));
const CreateHikeScreen = lazyScreen(() => import('./src/screens/CreateHikeScreen'));
const CreateYogaSessionScreen = lazyScreen(() => import('./src/screens/CreateYogaSessionScreen'));
const CreateFightTrainingScreen = lazyScreen(() => import('./src/screens/CreateFightTrainingScreen'));

// Agenda
const AgendaScreen = lazyScreen(() => import('./src/screens/AgendaScreen'));
const AgendaSettingsScreen = lazyScreen(() => import('./src/screens/AgendaSettingsScreen'));

// Athlete Screens
const AthleteHomeScreen = lazyScreen(() => import('./src/screens/AthleteHomeScreen'));
const EventsListScreen = lazyScreen(() => import('./src/screens/EventsListScreen'));
const EventDetailScreen = lazyScreen(() => import('./src/screens/EventDetailScreen'));
const RegistrationScreen = lazyScreen(() => import('./src/screens/RegistrationScreen'));
const MyRegistrationsScreen = lazyScreen(() => import('./src/screens/MyRegistrationsScreen'));
const ResultsScreen = lazyScreen(() => import('./src/screens/ResultsScreen'));
const RankingScreen = lazyScreen(() => import('./src/screens/RankingScreen'));
const ProfileScreen = lazyScreen(() => import('./src/screens/ProfileScreen'));
const EditProfileScreen = lazyScreen(() => import('./src/screens/EditProfileScreen'));
const CertificatesScreen = lazyScreen(() => import('./src/screens/CertificatesScreen'));
const EventGalleryScreen = lazyScreen(() => import('./src/screens/EventGalleryScreen'));
const RouteMapScreen = lazyScreen(() => import('./src/screens/RouteMapScreen'));

// Teams
const TeamsScreen = lazyScreen(() => import('./src/screens/TeamsScreen'));
const CreateTeamScreen = lazyScreen(() => import('./src/screens/CreateTeamScreen'));
const TeamDetailScreen = lazyScreen(() => import('./src/screens/TeamDetailScreen'));
const TeamRegistrationScreen = lazyScreen(() => import('./src/screens/TeamRegistrationScreen'));

// Organizer Screens
const OrganizerHomeScreen = lazyScreen(() => import('./src/screens/OrganizerHomeScreen'));
const OrganizerEventsScreen = lazyScreen(() => import('./src/screens/OrganizerEventsScreen'));
const OrganizerMetricsScreen = lazyScreen(() => import('./src/screens/OrganizerMetricsScreen'));
const CreateEventScreen = lazyScreen(() => import('./src/screens/CreateEventScreen'));
const EditEventScreen = lazyScreen(() => import('./src/screens/EditEventScreen'));
const VouchersScreen = lazyScreen(() => import('./src/screens/VouchersScreen'));
const NotificationsScreen = lazyScreen(() => import('./src/screens/NotificationsScreen'));
const ManageRegistrationsScreen = lazyScreen(() => import('./src/screens/ManageRegistrationsScreen'));
const PublishResultsScreen = lazyScreen(() => import('./src/screens/PublishResultsScreen'));
const CheckInScreen = lazyScreen(() => import('./src/screens/CheckInScreen'));
const EventResultsScreen = lazyScreen(() => import('./src/screens/EventResultsScreen'));

// Settings & Support
const SettingsScreen = lazyScreen(() => import('./src/screens/SettingsScreen'));
const SupportScreen = lazyScreen(() => import('./src/screens/SupportScreen'));
const HelpScreen = lazyScreen(() => import('./src/screens/HelpScreen'));
const PaymentsScreen = lazyScreen(() => import('./src/screens/PaymentsScreen'));

// Social & Profile
const SearchAthletesScreen = lazyScreen(() => import('./src/screens/SearchAthletesScreen'));
const AthleteProfileScreen = lazyScreen(() => import('./src/screens/AthleteProfileScreen'));
const MyGridScreen = lazyScreen(() => import('./src/screens/MyGridScreen'));
const UserGridScreen = lazyScreen(() => import('./src/screens/UserGridScreen'));
const FollowersListScreen = lazyScreen(() => import('./src/screens/FollowersListScreen'));
const FollowingListScreen = lazyScreen(() => import('./src/screens/FollowingListScreen'));
const GridProfileSetupScreen = lazyScreen(() => import('./src/screens/GridProfileSetupScreen'));
const SuggestFriendsScreen = lazyScreen(() => import('./src/screens/SuggestFriendsScreen'));
const ChatScreen = lazyScreen(() => import('./src/screens/ChatScreen'));
const ChatListScreen = lazyScreen(() => import('./src/screens/ChatListScreen'));
const FollowRequestsScreen = lazyScreen(() => import('./src/screens/FollowRequestsScreen'));
const SocialNotificationsScreen = lazyScreen(() => import('./src/screens/SocialNotificationsScreen'));
const EditGridBioScreen = lazyScreen(() => import('./src/screens/EditGridBioScreen'));

const Stack = createNativeStackNavigator<RootStackParamList>();

// ============================================
// LOADING FALLBACK COMPONENT
// Exibido enquanto screens são carregadas
// ============================================
const ScreenLoadingFallback = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

// ============================================
// WRAPPER PARA LAZY SCREENS
// Adiciona Suspense automaticamente
// ============================================
const withSuspense = <P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>
): React.FC<P> => {
  return (props: P) => (
    <Suspense fallback={<ScreenLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Pre-load all critical images
const cacheImages = async () => {
  try {
    const images = [
      require('./assets/images/logo.png'),
    ];
    
    const cachePromises = images.map(image => {
      return Asset.fromModule(image).downloadAsync();
    });
    
    await Promise.all(cachePromises);
  } catch (e) {
    // Silently fail - images will load on demand
    console.warn('Image cache warning:', e);
  }
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        // Prevent splash screen from hiding (inside useEffect, not top-level)
        await SplashScreen.preventAutoHideAsync().catch(() => {
          // Ignore error if splash screen is already hidden
        });

        // Pre-load images
        await cacheImages();
      } catch (e) {
        console.warn('Error during app preparation:', e);
        if (isMounted) {
          setBootError(e instanceof Error ? e.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setAppIsReady(true);
        }
      }
    }

    prepare();

    return () => {
      isMounted = false;
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore error if splash screen is already hidden
      }
    }
  }, [appIsReady]);

  // Show loading while app prepares
  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Show error screen if boot failed
  if (bootError) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#ff4444', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
          Erro ao iniciar o app
        </Text>
        <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>
          {bootError}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppProvider>
        <FiltersProvider>
          <ToastProvider>
            <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 250,
              }}
            >
              {/* ============================================ */}
              {/* AUTH SCREENS - Carregamento Estático */}
              {/* ============================================ */}
              <Stack.Screen 
                name="Splash" 
                component={SplashScreenComponent} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="Register" 
                component={RegisterScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              
              {/* ============================================ */}
              {/* AUTH SCREENS - Lazy Loading */}
              {/* ============================================ */}
              <Stack.Screen 
                name="ForgotPassword" 
                component={withSuspense(ForgotPasswordScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="ResetPassword" 
                component={withSuspense(ResetPasswordScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="AccountRecovery" 
                component={withSuspense(AccountRecoveryScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="EmailVerification" 
                component={withSuspense(EmailVerificationScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="ModeSelection" 
                component={withSuspense(ModeSelectionScreen)} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="Onboarding" 
                component={withSuspense(OnboardingScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              
              {/* ============================================ */}
              {/* FEED & SOCIAL - Lazy (usa expo-video) */}
              {/* ============================================ */}
              <Stack.Screen 
                name="Feed" 
                component={withSuspense(FeedScreen)} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="CreatePost" 
                component={withSuspense(CreatePostScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="Comments" 
                component={withSuspense(CommentsScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="SavedPosts" 
                component={withSuspense(SavedPostsScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="PostDetail" 
                component={withSuspense(PostDetailScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="VideoPlayer" 
                component={withSuspense(VideoPlayerScreen)} 
                options={{ 
                  animation: 'fade',
                  headerShown: false,
                  presentation: 'fullScreenModal'
                }}
              />
              
              {/* ============================================ */}
              {/* GROUPS - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="MyGroups" 
                component={withSuspense(MyGroupsScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="CreateGroup" 
                component={withSuspense(CreateGroupScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="GroupDetail" 
                component={withSuspense(GroupDetailScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="InviteMembers" 
                component={withSuspense(InviteMembersScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="ManageMembers" 
                component={withSuspense(ManageMembersScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="GroupRanking" 
                component={withSuspense(GroupRankingScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="GroupChat" 
                component={withSuspense(GroupChatScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              
              {/* ============================================ */}
              {/* TRAINING - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="TrainHub" 
                component={withSuspense(TrainHubScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="DiscoverTrainings" 
                component={withSuspense(DiscoverTrainingsScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="CreateTraining" 
                component={withSuspense(CreateTrainingScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="TrainingDetail" 
                component={withSuspense(TrainingDetailScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="ActivitySetup" 
                component={withSuspense(ActivitySetupScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="LiveTrainingMap" 
                component={withSuspense(LiveTrainingMapScreen)} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="TrainingSummary" 
                component={withSuspense(TrainingSummaryScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="CreateFunctionalTraining" 
                component={withSuspense(CreateFunctionalTrainingScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="CreateHike" 
                component={withSuspense(CreateHikeScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="CreateYogaSession" 
                component={withSuspense(CreateYogaSessionScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="CreateFightTraining" 
                component={withSuspense(CreateFightTrainingScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              
              {/* ============================================ */}
              {/* AGENDA - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="Agenda" 
                component={withSuspense(AgendaScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="AgendaSettings" 
                component={withSuspense(AgendaSettingsScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              
              {/* ============================================ */}
              {/* ATHLETE SCREENS - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="AthleteHome" 
                component={withSuspense(AthleteHomeScreen)} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="EventsList" 
                component={withSuspense(EventsListScreen)} 
              />
              <Stack.Screen 
                name="EventDetail" 
                component={withSuspense(EventDetailScreen)} 
              />
              <Stack.Screen 
                name="Registration" 
                component={withSuspense(RegistrationScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="MyRegistrations" 
                component={withSuspense(MyRegistrationsScreen)} 
              />
              <Stack.Screen 
                name="Results" 
                component={withSuspense(ResultsScreen)} 
              />
              <Stack.Screen 
                name="Ranking" 
                component={withSuspense(RankingScreen)} 
              />
              <Stack.Screen 
                name="Profile" 
                component={withSuspense(ProfileScreen)} 
              />
              <Stack.Screen 
                name="EditProfile" 
                component={withSuspense(EditProfileScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="Certificates" 
                component={withSuspense(CertificatesScreen)} 
              />
              <Stack.Screen 
                name="EventGallery" 
                component={withSuspense(EventGalleryScreen)} 
              />
              <Stack.Screen 
                name="RouteMap" 
                component={withSuspense(RouteMapScreen)} 
              />
              
              {/* ============================================ */}
              {/* TEAMS - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="Teams" 
                component={withSuspense(TeamsScreen)} 
              />
              <Stack.Screen 
                name="CreateTeam" 
                component={withSuspense(CreateTeamScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="TeamDetail" 
                component={withSuspense(TeamDetailScreen)} 
              />
              <Stack.Screen 
                name="TeamRegistration" 
                component={withSuspense(TeamRegistrationScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              
              {/* ============================================ */}
              {/* ORGANIZER SCREENS - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="OrganizerHome" 
                component={withSuspense(OrganizerHomeScreen)} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="OrganizerEvents" 
                component={withSuspense(OrganizerEventsScreen)} 
              />
              <Stack.Screen 
                name="OrganizerMetrics" 
                component={withSuspense(OrganizerMetricsScreen)} 
              />
              <Stack.Screen 
                name="CreateEvent" 
                component={withSuspense(CreateEventScreen)} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="EditEvent" 
                component={withSuspense(EditEventScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="Vouchers" 
                component={withSuspense(VouchersScreen)} 
              />
              <Stack.Screen 
                name="Notifications" 
                component={withSuspense(NotificationsScreen)} 
              />
              <Stack.Screen 
                name="ManageRegistrations" 
                component={withSuspense(ManageRegistrationsScreen)} 
              />
              <Stack.Screen 
                name="PublishResults" 
                component={withSuspense(PublishResultsScreen)} 
              />
              <Stack.Screen 
                name="CheckIn" 
                component={withSuspense(CheckInScreen)} 
              />
              <Stack.Screen 
                name="EventResults" 
                component={withSuspense(EventResultsScreen)} 
              />
              
              {/* ============================================ */}
              {/* SETTINGS & SUPPORT - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="Settings" 
                component={withSuspense(SettingsScreen)} 
              />
              <Stack.Screen 
                name="Support" 
                component={withSuspense(SupportScreen)} 
              />
              <Stack.Screen 
                name="Help" 
                component={withSuspense(HelpScreen)} 
              />
              <Stack.Screen 
                name="Payments" 
                component={withSuspense(PaymentsScreen)} 
              />
              
              {/* ============================================ */}
              {/* SOCIAL & PROFILE - Lazy */}
              {/* ============================================ */}
              <Stack.Screen 
                name="SearchAthletes" 
                component={withSuspense(SearchAthletesScreen)} 
              />
              <Stack.Screen 
                name="AthleteProfile" 
                component={withSuspense(AthleteProfileScreen)} 
              />
              <Stack.Screen 
                name="MyGrid" 
                component={withSuspense(MyGridScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="UserGrid" 
                component={withSuspense(UserGridScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="FollowersList" 
                component={withSuspense(FollowersListScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="FollowingList" 
                component={withSuspense(FollowingListScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="GridProfileSetup" 
                component={withSuspense(GridProfileSetupScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="SuggestFriends" 
                component={withSuspense(SuggestFriendsScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="Chat" 
                component={withSuspense(ChatScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="ChatList" 
                component={withSuspense(ChatListScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="FollowRequests" 
                component={withSuspense(FollowRequestsScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="SocialNotifications" 
                component={withSuspense(SocialNotificationsScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="EditGridBio" 
                component={withSuspense(EditGridBioScreen)} 
                options={{ animation: 'slide_from_right' }}
              />
            </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </FiltersProvider>
      </AppProvider>
    </View>
  );
}
