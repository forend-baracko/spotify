import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { COLORS, SPACE, RADIUS } from '../../constants/theme';

const EMOJI_OPTIONS = ['🎶', '🔥', '🎧', '🌙', '⚡', '🎉', '🏖️', '❤️', '🎸', '🎹'];

const CreatePlaylistModal = ({
    visible,
    onClose,
    onCreate,
    userProfile,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('🎶');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) return;
        const creator = userProfile
            ? {
                  uid: userProfile.uid || null,
                  name: userProfile.displayName || userProfile.username || 'You',
                displayName: userProfile.displayName || userProfile.username || 'You',
                username: userProfile.username || null,
                  photoURL: userProfile.photoURL || null,
              }
            : null;
        setError('');
        setIsSubmitting(true);
        try {
            await onCreate({
                title: title.trim(),
                description: description.trim(),
                icon: selectedEmoji,
                creator,
                cover: userProfile?.photoURL || null,
            });
            setTitle('');
            setDescription('');
            setSelectedEmoji('🎶');
            onClose();
        } catch (createError) {
            console.warn('Could not create playlist:', createError);
            setError('Could not create playlist. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <View style={styles.dialog}>
                    <Text style={styles.dialogTitle}>Give your playlist a name</Text>

                    {/* Emoji selector */}
                    <Text style={styles.label}>Choose an icon</Text>
                    <View style={styles.emojiRow}>
                        {EMOJI_OPTIONS.slice(0, 6).map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                style={[
                                    styles.emojiButton,
                                    selectedEmoji === emoji && styles.emojiButtonActive,
                                ]}
                                onPress={() => setSelectedEmoji(emoji)}
                            >
                                <Text style={styles.emojiText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Title Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="My playlist #1"
                        placeholderTextColor="#777"
                        value={title}
                        onChangeText={setTitle}
                        autoFocus={visible}
                        maxLength={40}
                    />

                    {/* Optional Description */}
                    <TextInput
                        style={[styles.input, styles.descInput]}
                        placeholder="Add an optional description"
                        placeholderTextColor="#777"
                        value={description}
                        onChangeText={setDescription}
                        maxLength={100}
                    />
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* Action buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.createBtn,
                            (!title.trim() || isSubmitting) && styles.createBtnDisabled,
                            ]}
                            onPress={handleCreate}
                            disabled={!title.trim() || isSubmitting}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.createText}>Create</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACE.lg,
    },
    dialog: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#242424',
        borderRadius: RADIUS.lg,
        padding: SPACE.xl,
        borderWidth: 1,
        borderColor: '#333',
    },
    dialogTitle: {
        color: COLORS.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: SPACE.md,
    },
    label: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: 8,
    },
    emojiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACE.md,
    },
    emojiButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#303030',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiButtonActive: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        backgroundColor: '#1E382B',
    },
    emojiText: {
        fontSize: 20,
    },
    input: {
        backgroundColor: '#181818',
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACE.md,
        paddingVertical: 12,
        color: COLORS.textPrimary,
        fontSize: 15,
        marginBottom: SPACE.sm,
        borderWidth: 1,
        borderColor: '#383838',
    },
    descInput: {
        fontSize: 13,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: SPACE.md,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: SPACE.lg,
        marginRight: SPACE.sm,
    },
    cancelText: {
        color: COLORS.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
    createBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: SPACE.xl,
        borderRadius: RADIUS.circle,
    },
    createBtnDisabled: {
        backgroundColor: '#2A5E3A',
        opacity: 0.6,
    },
    createText: {
        color: COLORS.black,
        fontSize: 15,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#FF8A8A',
        fontSize: 13,
        marginBottom: SPACE.sm,
    },
});

export default CreatePlaylistModal;
