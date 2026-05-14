import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Search, Plus, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AdminToolbarProps {
  search: string;
  onSearchChange: (text: string) => void;
  onAddPress: () => void;
  addLabel: string;
  placeholder?: string;
}

export default function AdminToolbar({
  search,
  onSearchChange,
  onAddPress,
  addLabel,
  placeholder = "Search...",
}: AdminToolbarProps) {
  const { isDark } = useTheme();
  
   const card   = isDark ? '#1E1E1E' : '#FFFFFF';
  const border = isDark ? '#2A2A2A' : '#E2E8F0';
  const text   = isDark ? '#F1F5F9' : '#0F172A';
  const sub    = isDark ? '#A0A0A0' : '#64748B';
  const primary = '#FF7A8A';

  return (
    <View style={[s.toolBar, { backgroundColor: card, borderBottomColor: border }]}>
      <View style={[s.searchBox, { backgroundColor: isDark ? '#121212' : '#F1F5F9', borderColor: border }]}>
        <Search size={18} color={sub} />
        <TextInput
          style={[s.searchInput, { color: text }]}
          placeholder={placeholder}
          placeholderTextColor={sub}
          value={search}
          onChangeText={onSearchChange}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <X size={18} color={sub} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={[s.addBtn, { backgroundColor: primary }]} onPress={onAddPress}>
        <Plus size={20} color="#fff" />
        <Text style={s.addBtnText}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  toolBar: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  searchBox: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  addBtn: { height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, display: Platform.OS === 'web' ? 'flex' : 'none' },
});
