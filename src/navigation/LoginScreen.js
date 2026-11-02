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

const LoginScreen = ({ navigation }) => {
    const { login, loginGoogle, isConfigured } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        setLocalError('');

        if (!email.trim() || !password) {
            setLocalError('Please enter both email and password.');
            return;
        }

        setIsSubmitting(true);
        try {
            await login(email, password);
        } catch (error) {
            setLocalError(error.message || 'Failed to sign in. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
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
                        <Text style={styles.title}>Log in to Spotify</Text>
                    </View>

                    {/* Notice if Firebase is in template state */}
                    {!isConfigured && (
                        <View style={styles.configNotice}>
                            <Text style={styles.configNoticeTitle}>Firebase Setup Required</Text>
                            <Text style={styles.configNoticeText}>
                                Update <Text style={styles.codeText}>src/constants/config.js</Text> with your Firebase keys to connect real user accounts.
                            </Text>
                        </View>
                    )}

                    {/* Error Banner */}
                    {!!localError && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{localError}</Text>
                        </View>
                    )}

                    {/* Form Fields */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Email or username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email address"
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

                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
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

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.loginButton,
                                (isSubmitting || isGoogleSubmitting) && styles.disabledButton,
                            ]}
                            onPress={handleLogin}
                            disabled={isSubmitting || isGoogleSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={COLORS.black} />
                            ) : (
                                <Text style={styles.loginButtonText}>Log In</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Sign-In Button */}
                        <TouchableOpacity
                            style={[
                                styles.googleButton,
                                (isSubmitting || isGoogleSubmitting) && styles.disabledButton,
                            ]}
                            onPress={handleGoogleSignIn}
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

                    {/* Register Switch */}
                </ScrollView>
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account?</Text>
                    <TouchableOpacity
                        onPress={() => navigation?.navigate('Register')}
                        style={styles.signupButton}
                        accessibilityRole="button"
                    >
                        <Text style={styles.signupText}>Sign up</Text>
                    </TouchableOpacity>
                </View>
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
        paddingBottom: SPACE.md,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACE.md,
    },
    logo: {
        width: 52,
        height: 52,
        resizeMode: 'contain',
        marginBottom: SPACE.sm,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: 'bold',
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
        marginBottom: SPACE.md,
    },
    label: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: SPACE.xs,
        marginTop: SPACE.sm,
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
        marginBottom: SPACE.lg,
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
    loginButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.circle,
        paddingVertical: SPACE.md,
        alignItems: 'center',
        marginTop: SPACE.sm,
    },
    disabledButton: {
        opacity: 0.7,
    },
    loginButtonText: {
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
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACE.lg,
        paddingTop: SPACE.sm,
        paddingBottom: SPACE.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginRight: SPACE.xs,
    },
    signupButton: {
        padding: SPACE.xs,
    },
    signupText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

export default LoginScreen;