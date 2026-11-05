import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TrackCategoriesBrowser = ({ tracks, selectedCategory, onSelectCategory }) => {
  const categories = [...new Set(
    tracks.flatMap((track) =>
      Array.isArray(track.categories) ? track.categories : []
    ).filter((category) => typeof category === 'string')
  )].sort((left, right) => left.localeCompare(right));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Available categories</Text>
      {categories.length ? (
        <View style={styles.categoryList} accessibilityLabel="Available music categories">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, isSelected && styles.selectedChip]}
                onPress={() => onSelectCategory(category)}
                accessibilityRole="button"
                accessibilityLabel={`Category: ${category}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.categoryText, isSelected && styles.selectedText]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyText}>No track categories are available yet.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  heading: {
    color: '#D5A5E8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#68477A',
    backgroundColor: '#30203B',
  },
  selectedChip: {
    borderColor: '#D5A5E8',
    backgroundColor: '#8E24AA',
  },
  categoryText: {
    color: '#E5D7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  emptyText: {
    color: '#B3A4BA',
    fontSize: 12,
  },
});

export default TrackCategoriesBrowser;