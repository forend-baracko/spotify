import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, RADIUS, SPACE } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import PageOne from '../components/onboarding/PageOne';
import PageTwo from '../components/onboarding/PageTwo';
import PageThree from '../components/onboarding/PageThree';

export default function OnBoardingScreen({ navigation }) {
    const { completeOnboarding } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);

    const finishOnboarding = () => {
        completeOnboarding?.();
        if (navigation?.replace) {
            navigation.replace('Login');
        } else if (navigation?.navigate) {
            navigation.navigate('Login');
        }
    };

    const handleNext = () => {
        if (currentPage < 3) {
            setCurrentPage(currentPage + 1);
        } else {
            finishOnboarding();
        }
    };

    const handleBack = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Bar with Skip */}
            <View style={styles.topBar}>
                {currentPage > 1 ? (
                    <TouchableOpacity onPress={handleBack} style={styles.navButton}>
                        <Text style={styles.navText}>Back</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.navButtonPlaceholder} />
                )}

                <TouchableOpacity onPress={finishOnboarding} style={styles.navButton}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            {/* Page Content */}
            <View style={styles.content}>
                {currentPage === 1 && <PageOne />}
                {currentPage === 2 && <PageTwo />}
                {currentPage === 3 && <PageThree />}
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
                {/* Dots indicator */}
                <View style={styles.indicatorContainer}>
                    {[1, 2, 3].map((step) => (
                        <View
                            key={step}
                            style={[
                                styles.dot,
                                currentPage === step ? styles.activeDot : styles.inactiveDot,
                            ]}
                        />
                    ))}
                </View>

                {/* Continue / Get Started Button */}
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.continueText}>
                        {currentPage === 3 ? 'Get Started' : 'Continue'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'space-between',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACE.lg,
        paddingTop: SPACE.sm,
        height: 48,
    },
    navButton: {
        padding: SPACE.sm,
    },
    navButtonPlaceholder: {
        width: 48,
    },
    navText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    skipText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACE.lg,
    },
    bottomBar: {
        paddingHorizontal: SPACE.lg,
        paddingBottom: SPACE.xl,
        alignItems: 'center',
    },
    indicatorContainer: {
        flexDirection: 'row',
        marginBottom: SPACE.lg,
        gap: SPACE.sm,
    },
    dot: {
        height: 8,
        borderRadius: RADIUS.circle,
    },
    activeDot: {
        width: 24,
        backgroundColor: COLORS.primary,
    },
    inactiveDot: {
        width: 8,
        backgroundColor: COLORS.border,
    },
    continueButton: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: SPACE.md,
        borderRadius: RADIUS.circle,
        alignItems: 'center',
    },
    continueText: {
        color: COLORS.black,
        fontSize: 16,
        fontWeight: 'bold',
    },
});