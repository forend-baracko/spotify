import React, { useState } from 'react';
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

const RegisterScreen = ({ navigation }) => {
    const { register, loginGoogle, isConfigured } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        setLocalError('');

        if (!email.trim() || !password) {
            setLocalError('Please enter both email and password.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setLocalError('Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            await register(email, password, displayName);
        } catch (error) {
            setLocalError(error.message || 'Failed to create account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setLocalError('');
        setIsGoogleSubmitting(true);
        try {
            await loginGoogle();
        } catch (error) {
            setLocalError(error.message || 'Google sign-in failed.');
        } finally {
            setIsGoogleSubmitting(false);
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
                    {/* Header Logo */}
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/images/spotify-icon.webp')}
                            style={styles.logo}
                        />
                        <Text style={styles.title}>Sign up for free</Text>
                        <Text style={styles.subtitle}>Create your Spotify clone account</Text>
                    </View>

                    {/* Notice if Firebase is in template state */}
                    {!isConfigured && (
                        <View style={styles.configNotice}>
                            <Text style={styles.configNoticeTitle}>Firebase Setup Required</Text>
                            <Text style={styles.configNoticeText}>
                                Please update <Text style={styles.codeText}>src/constants/config.js</Text> with your Firebase credentials to enable real registration.
                            </Text>
                        </View>
                    )}

                    {/* Error Box */}
                    {!!localError && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{localError}</Text>
                        </View>
                    )}

                    {/* Form Fields */}
                    <View style={styles.form}>
                        <Text style={styles.label}>What should we call you?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor={COLORS.textMuted}
                            value={displayName}
                            onChangeText={(text) => {
                                setDisplayName(text);
                                if (localError) setLocalError('');
                            }}
                            autoCapitalize="words"
                        />

                        <Text style={styles.label}>What's your email?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.textMuted}
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (localError) setLocalError('');
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                        />

                        <Text style={styles.label}>Create a password (min. 6 characters)</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Create a password"
                                placeholderTextColor={COLORS.textMuted}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (localError) setLocalError('');
                                }}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeText}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Confirm your password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm password"
                            placeholderTextColor={COLORS.textMuted}
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (localError) setLocalError('');
                            }}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.registerButton,
                                (isSubmitting || isGoogleSubmitting) && styles.disabledButton,
                            ]}
                            onPress={handleRegister}
                            disabled={isSubmitting || isGoogleSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={COLORS.black} />
                            ) : (
                                <Text style={styles.registerButtonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Sign-Up Button */}
                        <TouchableOpacity
                            style={[
                                styles.googleButton,
                                (isSubmitting || isGoogleSubmitting) && styles.disabledButton,
                            ]}
                            onPress={handleGoogleSignUp}
                            disabled={isSubmitting || isGoogleSubmitting}
                            activeOpacity={0.8}
                        >
                            {isGoogleSubmitting ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.googleButtonText}>Continue with Google</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Switch to Login */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <TouchableOpacity
                            onPress={() => navigation?.navigate('Login')}
                            style={styles.loginSwitchButton}
                        >
                            <Text style={styles.loginSwitchText}>Log in</Text>
                        </TouchableOpacity>
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
        paddingTop: SPACE.lg,
        paddingBottom: SPACE.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACE.lg,
    },
    logo: {
        width: 56,
        height: 56,
        resizeMode: 'contain',
        marginBottom: SPACE.sm,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    configNotice: {
        backgroundColor: COLORS.surfaceElevated,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: RADIUS.sm,
        padding: SPACE.md,
        marginBottom: SPACE.md,
    },
    configNoticeTitle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 4,
    },
    configNoticeText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },
    codeText: {
        color: COLORS.white,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
        marginBottom: SPACE.lg,
    },
    label: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: SPACE.xs,
        marginTop: SPACE.xs,
    },
    input: {
        backgroundColor: COLORS.inputBackground,
        color: COLORS.textPrimary,
        borderRadius: RADIUS.xs,
        paddingHorizontal: SPACE.md,
        paddingVertical: SPACE.md,
        fontSize: 15,
        marginBottom: SPACE.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACE.sm,
    },
    passwordInput: {
        flex: 1,
        color: COLORS.textPrimary,
        paddingHorizontal: SPACE.md,
        paddingVertical: SPACE.md,
        fontSize: 15,
    },
    eyeButton: {
        paddingHorizontal: SPACE.md,
        paddingVertical: SPACE.md,
    },
    eyeText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    registerButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.circle,
        paddingVertical: SPACE.md,
        alignItems: 'center',
        marginTop: SPACE.md,
    },
    disabledButton: {
        opacity: 0.7,
    },
    registerButtonText: {
        color: COLORS.black,
        fontSize: 16,
        fontWeight: 'bold',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACE.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        color: COLORS.textMuted,
        paddingHorizontal: SPACE.md,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    googleButton: {
        backgroundColor: COLORS.surfaceElevated,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: RADIUS.circle,
        paddingVertical: SPACE.md,
        alignItems: 'center',
    },
    googleButtonText: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        marginTop: SPACE.sm,
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: SPACE.xs,
    },
    loginSwitchButton: {
        padding: SPACE.xs,
    },
    loginSwitchText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

export default RegisterScreen;
