import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { RootStackParamList } from './src/types';
import { AppProvider } from './src/contexts/AppContext';
import { FiltersProvider } from './src/contexts/FiltersContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { COLORS } from './src/constants/theme';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/config/toastConfig';

// Screens
import SplashScreenComponent from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ModeSelectionScreen from './src/screens/ModeSelectionScreen';
import AthleteHomeScreen from './src/screens/AthleteHomeScreen';
import OrganizerHomeScreen from './src/screens/OrganizerHomeScreen';
import EventsListScreen from './src/screens/EventsListScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import MyRegistrationsScreen from './src/screens/MyRegistrationsScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import CertificatesScreen from './src/screens/CertificatesScreen';
import EventGalleryScreen from './src/screens/EventGalleryScreen';
import RouteMapScreen from './src/screens/RouteMapScreen';
import TeamsScreen from './src/screens/TeamsScreen';
import CreateTeamScreen from './src/screens/CreateTeamScreen';
import TeamDetailScreen from './src/screens/TeamDetailScreen';
import TeamRegistrationScreen from './src/screens/TeamRegistrationScreen';
import OrganizerEventsScreen from './src/screens/OrganizerEventsScreen';
import OrganizerMetricsScreen from './src/screens/OrganizerMetricsScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import EditEventScreen from './src/screens/EditEventScreen';
import VouchersScreen from './src/screens/VouchersScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ManageRegistrationsScreen from './src/screens/ManageRegistrationsScreen';
import PublishResultsScreen from './src/screens/PublishResultsScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import RankingScreen from './src/screens/RankingScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SupportScreen from './src/screens/SupportScreen';
import HelpScreen from './src/screens/HelpScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import EventResultsScreen from './src/screens/EventResultsScreen';
import FeedScreen from './src/screens/FeedScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import InviteMembersScreen from './src/screens/InviteMembersScreen';
import TrainHubScreen from './src/screens/TrainHubScreen';
import DiscoverTrainingsScreen from './src/screens/DiscoverTrainingsScreen';
import CreateTrainingScreen from './src/screens/CreateTrainingScreen';
import TrainingDetailScreen from './src/screens/TrainingDetailScreen';
import ActivitySetupScreen from './src/screens/ActivitySetupScreen';
import LiveTrainingMapScreen from './src/screens/LiveTrainingMapScreen';
import TrainingSummaryScreen from './src/screens/TrainingSummaryScreen';
import AgendaScreen from './src/screens/AgendaScreen';
import AgendaSettingsScreen from './src/screens/AgendaSettingsScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CommentsScreen from './src/screens/CommentsScreen';
import SavedPostsScreen from './src/screens/SavedPostsScreen';
import SearchAthletesScreen from './src/screens/SearchAthletesScreen';
import AthleteProfileScreen from './src/screens/AthleteProfileScreen';
import MyGridScreen from './src/screens/MyGridScreen';
import UserGridScreen from './src/screens/UserGridScreen';
import FollowersListScreen from './src/screens/FollowersListScreen';
import FollowingListScreen from './src/screens/FollowingListScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import GridProfileSetupScreen from './src/screens/GridProfileSetupScreen';
import SuggestFriendsScreen from './src/screens/SuggestFriendsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import FollowRequestsScreen from './src/screens/FollowRequestsScreen';
import SocialNotificationsScreen from './src/screens/SocialNotificationsScreen';
import EditGridBioScreen from './src/screens/EditGridBioScreen';
import AccountRecoveryScreen from './src/screens/AccountRecoveryScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
// V12.10 - Groups Expanded
import MyGroupsScreen from './src/screens/MyGroupsScreen';
import EditGroupScreen from './src/screens/EditGroupScreen';
import ManageMembersScreen from './src/screens/ManageMembersScreen';
import GroupRankingScreen from './src/screens/GroupRankingScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import CreateFunctionalTrainingScreen from './src/screens/CreateFunctionalTrainingScreen';
import CreateHikeScreen from './src/screens/CreateHikeScreen';
import CreateYogaSessionScreen from './src/screens/CreateYogaSessionScreen';
import CreateFightTrainingScreen from './src/screens/CreateFightTrainingScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

// Pre-load all critical images
const cacheImages = async () => {
  const images = [
    require('./assets/images/logo.png'),
  ];
  
  const cachePromises = images.map(image => {
    return Asset.fromModule(image).downloadAsync();
  });
  
  await Promise.all(cachePromises);
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load images
        await cacheImages();
      } catch (e) {
        console.warn('Error loading assets:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
              {/* Auth Screens - Fade animation */}
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
              <Stack.Screen 
                name="ForgotPassword" 
                component={ForgotPasswordScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="ResetPassword" 
                component={ResetPasswordScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="AccountRecovery" 
                component={AccountRecoveryScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="EmailVerification" 
                component={EmailVerificationScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="ModeSelection" 
                component={ModeSelectionScreen} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="Onboarding" 
                component={OnboardingScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              
              {/* Feed Screen - Tela inicial após login */}
              <Stack.Screen 
                name="Feed" 
                component={FeedScreen} 
                options={{ animation: 'fade' }}
              />
              
              {/* Community Stack - Grupos */}
              <Stack.Screen 
                name="MyGroups" 
                component={MyGroupsScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="CreateGroup" 
                component={CreateGroupScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="EditGroup" 
                component={EditGroupScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="GroupDetail" 
                component={GroupDetailScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="InviteMembers" 
                component={InviteMembersScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              {/* V12.10 - Groups Expanded */}
              <Stack.Screen 
                name="ManageMembers" 
                component={ManageMembersScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="GroupRanking" 
                component={GroupRankingScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="GroupChat" 
                component={GroupChatScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="CreateFunctionalTraining" 
                component={CreateFunctionalTrainingScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="CreateHike" 
                component={CreateHikeScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="CreateYogaSession" 
                component={CreateYogaSessionScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="CreateFightTraining" 
                component={CreateFightTrainingScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              
              {/* Training Stack - Sistema de Treino */}
              <Stack.Screen 
                name="TrainHub" 
                component={TrainHubScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="DiscoverTrainings" 
                component={DiscoverTrainingsScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="CreateTraining" 
                component={CreateTrainingScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="TrainingDetail" 
                component={TrainingDetailScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="ActivitySetup" 
                component={ActivitySetupScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="LiveTrainingMap" 
                component={LiveTrainingMapScreen} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen 
                name="TrainingSummary" 
                component={TrainingSummaryScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              
              {/* Agenda Stack - Calendário Unificado */}
              <Stack.Screen 
                name="Agenda" 
                component={AgendaScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="AgendaSettings" 
                component={AgendaSettingsScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="CreatePost" 
                component={CreatePostScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="Comments" 
                component={CommentsScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              
              {/* Athlete Screens - Slide animations */}
              <Stack.Screen 
                name="AthleteHome" 
                component={AthleteHomeScreen} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen name="EventsList" component={EventsListScreen} />
              <Stack.Screen name="EventDetail" component={EventDetailScreen} />
              <Stack.Screen 
                name="Registration" 
                component={RegistrationScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="MyRegistrations" component={MyRegistrationsScreen} />
              <Stack.Screen name="Results" component={ResultsScreen} />
              <Stack.Screen name="Ranking" component={RankingScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen 
                name="EditProfile" 
                component={EditProfileScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="SavedPosts" 
                component={SavedPostsScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen name="Certificates" component={CertificatesScreen} />
              <Stack.Screen name="EventGallery" component={EventGalleryScreen} />
              <Stack.Screen name="RouteMap" component={RouteMapScreen} />
              
              {/* Team Screens */}
              <Stack.Screen name="Teams" component={TeamsScreen} />
              <Stack.Screen 
                name="CreateTeam" 
                component={CreateTeamScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
              <Stack.Screen 
                name="TeamRegistration" 
                component={TeamRegistrationScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              
              {/* Organizer Screens */}
              <Stack.Screen 
                name="OrganizerHome" 
                component={OrganizerHomeScreen} 
                options={{ animation: 'fade' }}
              />
              <Stack.Screen name="OrganizerEvents" component={OrganizerEventsScreen} />
              <Stack.Screen name="OrganizerMetrics" component={OrganizerMetricsScreen} />
              <Stack.Screen 
                name="CreateEvent" 
                component={CreateEventScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="EditEvent" 
                component={EditEventScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen name="Vouchers" component={VouchersScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="ManageRegistrations" component={ManageRegistrationsScreen} />
              <Stack.Screen name="PublishResults" component={PublishResultsScreen} />
              <Stack.Screen name="CheckIn" component={CheckInScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="Help" component={HelpScreen} />
              <Stack.Screen name="Payments" component={PaymentsScreen} />
              <Stack.Screen name="EventResults" component={EventResultsScreen} />
              <Stack.Screen name="SearchAthletes" component={SearchAthletesScreen} />
              <Stack.Screen name="AthleteProfile" component={AthleteProfileScreen} />
              
              {/* Profile Grid Screens */}
              <Stack.Screen 
                name="MyGrid" 
                component={MyGridScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="UserGrid" 
                component={UserGridScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="FollowersList" 
                component={FollowersListScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="FollowingList" 
                component={FollowingListScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="PostDetail" 
                component={PostDetailScreen} 
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen 
                name="VideoPlayer" 
                component={VideoPlayerScreen} 
                options={{ 
                  animation: 'fade',
                  headerShown: false,
                  presentation: 'fullScreenModal'
                }}
              />
              <Stack.Screen 
                name="GridProfileSetup" 
                component={GridProfileSetupScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="SuggestFriends" 
                component={SuggestFriendsScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="Chat" 
                component={ChatScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="ChatList" 
                component={ChatListScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="FollowRequests" 
                component={FollowRequestsScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="SocialNotifications" 
                component={SocialNotificationsScreen} 
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen 
                name="EditGridBio" 
                component={EditGridBioScreen} 
                options={{ animation: 'slide_from_right' }}
              />
            </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </FiltersProvider>
      </AppProvider>
      <Toast config={toastConfig} />
    </View>
  );
}
