import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACE, RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const SetUsernameScreen = ({ navigation }) => {
    const { user, userProfile, saveUsername, logout } = useAuth();
    const [username, setUsername] = useState(userProfile?.username || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // If username is already saved in Firebase / local profile, redirect to Home
    useEffect(() => {
        if (userProfile?.username && userProfile.username.trim().length > 0) {
            if (navigation?.replace) {
                navigation.replace('Home');
            } else if (navigation?.navigate) {
                navigation.navigate('Home');
            }
        }
    }, [userProfile?.username, navigation]);

    const trimmedUsername = username.trim();
    const isValidFormat = USERNAME_REGEX.test(trimmedUsername);

    const getValidationMessage = () => {
        if (!trimmedUsername) return null;
        if (trimmedUsername.length < 3) {
            return 'Username must be at least 3 characters long.';
        }
        if (trimmedUsername.length > 30) {
            return 'Username must be 30 characters or fewer.';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
            return 'Only letters, numbers, and underscores are allowed.';
        }
        return null;
    };

    const validationMessage = getValidationMessage();

    const handleSubmit = async () => {
        setLocalError('');

        if (!trimmedUsername) {
            setLocalError('Please enter a username to continue.');
            return;
        }

        if (validationMessage) {
            setLocalError(validationMessage);
            return;
        }

        setIsSubmitting(true);
        try {
            await saveUsername(trimmedUsername);
            if (navigation?.replace) {
                navigation.replace('Home');
            } else if (navigation?.navigate) {
                navigation.navigate('Home');
            }
        } catch (error) {
            setLocalError(error.message || 'Failed to save username. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await logout();
        } catch (error) {
            console.warn('Logout failed:', error);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Top Navigation Bar with Sign Out option */}
                    <View style={styles.topBar}>
                        <Image
                            source={require('../assets/images/spotify-icon.webp')}
                            style={styles.logoMini}
                        />
                        <TouchableOpacity
                            onPress={handleSignOut}
                            style={styles.signOutButton}
                            accessibilityRole="button"
                            accessibilityLabel="Sign out of current account"
                        >
                            <Text style={styles.signOutText}>Sign out</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.stepBadge}>STEP 1 OF 1</Text>
                        <Text style={styles.title}>What's your username?</Text>
                        <Text style={styles.subtitle}>
                            This is how you'll appear on your Spotify clone profile, playlists, and recommendations.
                        </Text>
                    </View>

                    {/* Error Banner */}
                    {!!localError && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{localError}</Text>
                        </View>
                    )}

                    {/* Input Container */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Username</Text>
                        <View
                            style={[
                                styles.inputWrapper,
                                isFocused && styles.inputWrapperFocused,
                                !!validationMessage && styles.inputWrapperError,
                                isValidFormat && styles.inputWrapperSuccess,
                            ]}
                        >
                            <Text style={styles.atSymbol}>@</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="username"
                                placeholderTextColor={COLORS.textMuted}
                                value={username}
                                onChangeText={(text) => {
                                    setUsername(text.replace(/\s+/g, ''));
                                    if (localError) setLocalError('');
                                }}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={30}
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                            {isValidFormat && (
                                <Text style={styles.checkMark}>✓</Text>
                            )}
                        </View>

                        {/* Inline validation or hints */}
                        <View style={styles.metaRow}>
                            {validationMessage ? (
                                <Text style={styles.validationErrorText}>{validationMessage}</Text>
                            ) : (
                                <Text style={styles.hintText}>
                                    3-30 characters (letters, numbers, underscores)
                                </Text>
                            )}
                            <Text style={styles.charCounter}>
                                {trimmedUsername.length}/30
                            </Text>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[
                                styles.continueButton,
                                (!isValidFormat || isSubmitting) && styles.disabledButton,
                            ]}
                            onPress={handleSubmit}
                            disabled={!isValidFormat || isSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={COLORS.black} />
                            ) : (
                                <Text style={styles.continueButtonText}>Finish Setup</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer Info */}
                    <View style={styles.footer}>
                        {user?.email ? (
                            <Text style={styles.accountText}>
                                Signed in as <Text style={styles.emailHighlight}>{user.email}</Text>
                            </Text>
                        ) : null}
                        <Text style={styles.footerTerms}>
                            You can update your profile display at any time in Settings.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACE.lg,
        paddingTop: SPACE.md,
        paddingBottom: SPACE.xl,
        justifyContent: 'space-between',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACE.xs,
        marginBottom: SPACE.md,
    },
    logoMini: {
        width: 36,
        height: 36,
        resizeMode: 'contain',
    },
    signOutButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: RADIUS.circle,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    signOutText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    header: {
        marginTop: SPACE.sm,
        marginBottom: SPACE.xl,
    },
    stepBadge: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.2,
        marginBottom: SPACE.xs,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: SPACE.xs,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    errorBox: {
        backgroundColor: COLORS.errorBackground,
        borderColor: COLORS.error,
        borderWidth: 1,
        borderRadius: RADIUS.sm,
        padding: SPACE.md,
        marginBottom: SPACE.md,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        marginVertical: SPACE.md,
    },
    label: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: SPACE.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: RADIUS.sm,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SPACE.md,
        paddingVertical: Platform.OS === 'ios' ? SPACE.md : SPACE.xs,
    },
    inputWrapperFocused: {
        borderColor: COLORS.primary,
    },
    inputWrapperError: {
        borderColor: COLORS.error,
    },
    inputWrapperSuccess: {
        borderColor: COLORS.primary,
    },
    atSymbol: {
        color: COLORS.textSecondary,
        fontSize: 18,
        fontWeight: '600',
        marginRight: 6,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 16,
        paddingVertical: SPACE.sm,
    },
    checkMark: {
        color: COLORS.primary,
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: SPACE.xs,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: SPACE.lg,
    },
    hintText: {
        color: COLORS.textMuted,
        fontSize: 12,
        flex: 1,
    },
    validationErrorText: {
        color: COLORS.error,
        fontSize: 12,
        flex: 1,
    },
    charCounter: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginLeft: SPACE.sm,
    },
    continueButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.circle,
        paddingVertical: SPACE.md,
        alignItems: 'center',
        marginTop: SPACE.sm,
    },
    disabledButton: {
        opacity: 0.5,
    },
    continueButtonText: {
        color: COLORS.black,
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        alignItems: 'center',
        marginTop: SPACE.xl,
        paddingTop: SPACE.md,
    },
    accountText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginBottom: 6,
    },
    emailHighlight: {
        color: COLORS.white,
        fontWeight: '600',
    },
    footerTerms: {
        color: COLORS.textMuted,
        fontSize: 12,
        textAlign: 'center',
    },
});

export default SetUsernameScreen;
