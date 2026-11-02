import React from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

import OnBoardingScreen from './OnBoardingScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import SetUsernameScreen from './SetUsernameScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { user, userProfile, isLoading, isProfileLoading, hasSeenOnboarding } = useAuth();

    // While initializing auth or fetching the user profile from Firebase/AsyncStorage,
    // show the splash loader so the user is never prematurely routed.
    if (isLoading || isProfileLoading || (user && !userProfile)) {
        return (
            <View style={styles.splashContainer}>
                <Image
                    source={require('../assets/images/spotify-icon.webp')}
                    style={styles.splashLogo}
                />
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
            </View>
        );
    }

    const hasUsername = Boolean(userProfile?.username && userProfile.username.trim().length > 0);

    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {!user ? (
                // Unauthenticated Auth Stack:
                // If the user has already seen onboarding or logged out, go straight to Login.
                <Stack.Group>
                    {hasSeenOnboarding ? (
                        <>
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="Register" component={RegisterScreen} />
                            <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="Register" component={RegisterScreen} />
                        </>
                    )}
                </Stack.Group>
            ) : !hasUsername ? (
                // Authenticated Stack without username: SetUsername is first
                <Stack.Group>
                    <Stack.Screen name="SetUsername" component={SetUsernameScreen} />
                    <Stack.Screen name="Home" component={HomeScreen} />
                </Stack.Group>
            ) : (
                // Authenticated Stack with username: Home is first
                <Stack.Group>
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="SetUsername" component={SetUsernameScreen} />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    splashLogo: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
    },
    spinner: {
        marginTop: 24,
    },
});
