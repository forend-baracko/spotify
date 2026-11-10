import React, { useRef, useState } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../icons/AppIcon';
import PlaylistButton from '../buttons/PlaylistButton';

const EMOJI_OPTIONS = ['🎶', '🔥', '🎧', '🌙', '⚡', '🎉'];

const CreatePlaylistModal = ({ visible, onClose, onCreate, userProfile }) => {
  const insets = useSafeAreaInsets();
  const titleInput = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎶');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const creator = userProfile ? {
      uid: userProfile.uid || null,
      name: userProfile.displayName || userProfile.username || 'You',
      displayName: userProfile.displayName || userProfile.username || 'You',
      username: userProfile.username || null,
      photoURL: userProfile.photoURL || null,
    } : null;
    setError('');
    setIsSubmitting(true);
    try {
      await onCreate({
        title: title.trim(), description: description.trim(), icon: selectedEmoji,
        creator, cover: userProfile?.photoURL || null,
      });
      setTitle('');
      setDescription('');
      setSelectedEmoji('🎶');
      setShowOptions(false);
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
      transparent visible={visible} animationType="slide" statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => titleInput.current?.focus()}
    >
      <KeyboardAvoidingView behavior="height" style={styles.overlay}>
        <View style={[styles.sheet, { marginTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose} style={styles.closeButton}
              accessibilityRole="button" accessibilityLabel="Close playlist creation"
            >
              <AppIcon name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll} contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          >
            <View style={styles.naming}>
              <Text style={styles.heading}>Give your playlist a name</Text>
              <TextInput
                ref={titleInput} accessibilityLabel="Playlist name"
                style={styles.nameInput} placeholder="My playlist #1"
                placeholderTextColor="#D4D4D4" selectionColor="#1ED760"
                underlineColorAndroid="transparent" value={title} onChangeText={setTitle}
                selectTextOnFocus maxLength={40} returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <PlaylistButton label="Create" onPress={handleCreate} disabled={!title.trim()} loading={isSubmitting} />
              <TouchableOpacity
                style={styles.optionsToggle} accessibilityRole="button"
                accessibilityLabel="More playlist options"
                accessibilityState={{ expanded: showOptions }}
                onPress={() => setShowOptions((value) => !value)}
              >
                <Text style={styles.optionsText}>{showOptions ? 'Fewer options' : 'More options'}</Text>
              </TouchableOpacity>
              {showOptions && (
                <View style={styles.options}>
                  <Text style={styles.optionsLabel}>Choose an icon</Text>
                  <View style={styles.emojiRow}>
                    {EMOJI_OPTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji} accessibilityRole="button"
                        accessibilityLabel={`Use ${emoji} as playlist icon`}
                        accessibilityState={{ selected: selectedEmoji === emoji }}
                        style={[styles.emojiButton, selectedEmoji === emoji && styles.emojiSelected]}
                        onPress={() => setSelectedEmoji(emoji)}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    accessibilityLabel="Playlist description" style={styles.descriptionInput}
                    placeholder="Add an optional description" placeholderTextColor="#B3B3B3"
                    value={description} onChangeText={setDescription} maxLength={100}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: '#303030', backgroundImage: 'linear-gradient(180deg, #484848 0%, #252525 100%)', overflow: 'hidden',
  },
  header: { height: 64, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-end' },
  closeButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 24 },
  naming: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  heading: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 56 },
  nameInput: {
    color: '#FFFFFF', fontSize: 34, fontWeight: '700', textAlign: 'center',
    borderBottomColor: '#898989', borderBottomWidth: 1, paddingVertical: 10,
    paddingHorizontal: 0, marginBottom: 32,
  },
  optionsToggle: { minHeight: 48, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 8 },
  optionsText: { color: '#D0D0D0', fontSize: 13 },
  options: { marginTop: 16 },
  optionsLabel: { color: '#E0E0E0', fontSize: 14, marginBottom: 12 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 16 },
  emojiButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#343434' },
  emojiSelected: { borderWidth: 2, borderColor: '#1ED760' },
  emojiText: { fontSize: 24 },
  descriptionInput: { color: '#FFFFFF', backgroundColor: '#242424', borderRadius: 8, padding: 12, fontSize: 15, minHeight: 48 },
  error: { color: '#FFB4AB', textAlign: 'center', marginBottom: 16, fontSize: 14 },
});

export default CreatePlaylistModal;
