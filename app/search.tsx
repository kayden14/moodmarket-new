/**
 * app/search.tsx — fully themed for light & dark mode
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Product } from '@/types/database';
import { ArrowLeft, Search, X, Star } from 'lucide-react-native';
import { useResponsive } from '@/hooks/useResponsive';

const POPULAR = ['Skincare', 'Relaxing', 'Energy', 'Happy', 'Self-care', 'Cozy'];

export default function SearchScreen() {
  const router   = useRouter();
  const { theme, isDark } = useTheme();
  const { isWide, isDesktop, width: windowWidth } = useResponsive();
  const inputRef = useRef<TextInput>(null);

  const numColumns = isWide ? 2 : 1;
  const cardWidth = isWide ? (Math.min(windowWidth, 1200) - 48) / 2 : windowWidth;

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearched(false); return; }
    const t = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const doSearch = async (q: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('products').select('*')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('rating', { ascending: false }).limit(30);
    setResults(data ?? []);
    setSearched(true);
    setLoading(false);
  };

  const clear = () => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); };

  const renderItem = ({ item }: { item: Product }) => {
    const stars = Math.round(item.rating ?? 0);
    return (
      <TouchableOpacity
        style={[r.item, { backgroundColor: theme.card }]}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.image ?? `https://picsum.photos/seed/${item.id}/120/120` }}
          style={r.img}
          contentFit="cover"
        />
        <View style={r.info}>
          <Text style={[r.name, { color: theme.textPrimary }]} numberOfLines={2}>{item.name}</Text>
          <View style={r.stars}>
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={10} color={theme.primary}
                fill={i <= stars ? theme.primary : 'transparent'} />
            ))}
            <Text style={[r.rating, { color: theme.textSecondary }]}>{item.rating?.toFixed(1)}</Text>
          </View>
          <Text style={[r.price, { color: theme.primary }]}>GH₵{item.price.toFixed(2)}</Text>
        </View>
        <Text style={[r.arrow, { color: theme.inactive }]}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={s.container}>

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={[s.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Search size={16} color={theme.textSecondary} />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, { color: theme.textPrimary }]}
            placeholder="Search products, moods…"
            placeholderTextColor={theme.inactive}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => query.trim() && doSearch(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Body ── */}
      {!searched && query.length < 2 ? (
        <View style={s.empty}>
          <Text style={[s.popularTitle, { color: theme.textPrimary }]}>Popular searches</Text>
          <View style={s.tagsRow}>
            {POPULAR.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[s.tag, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setQuery(tag)}
              >
                <Text style={[s.tagTxt, { color: theme.textPrimary }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      ) : loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.primary} />
        </View>

      ) : results.length === 0 && searched ? (
        <View style={s.center}>
          <Text style={s.noEmoji}>🔍</Text>
          <Text style={[s.noTitle, { color: theme.textPrimary }]}>No results for "{query}"</Text>
          <Text style={[s.noSub,   { color: theme.textSecondary }]}>Try a different keyword or mood</Text>
        </View>

      ) : (
        <FlatList
          key={numColumns}
          data={results}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? s.columnWrapper : undefined}
          contentContainerStyle={[s.list, isWide && s.listWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => numColumns === 1 ? <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 92 }} /> : null}
          ListHeaderComponent={
            <Text style={[s.count, { color: theme.textSecondary }]}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </Text>
          }
        />
      )}
      </View>
    </View>
  );
}

const r = StyleSheet.create({
  item:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, flex: 1 },
  img:   { width: 64, height: 64, borderRadius: 12 },
  info:  { flex: 1, gap: 4 },
  name:  { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rating:{ fontSize: 11, fontWeight: '600', marginLeft: 3 },
  price: { fontSize: 14, fontWeight: '800' },
  arrow: { fontSize: 22, lineHeight: 26, paddingLeft: 4 },
});

const s = StyleSheet.create({
  container:   { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 1200 },
  header:      { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, gap: 8, height: 42 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  empty:       { padding: 24 },
  popularTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 14 },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:         { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  tagTxt:      { fontSize: 13, fontWeight: '500' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  noEmoji:     { fontSize: 40, marginBottom: 8 },
  noTitle:     { fontSize: 16, fontWeight: '700' },
  noSub:       { fontSize: 13 },
  count:       { fontSize: 12, fontWeight: '500', paddingHorizontal: 16, paddingVertical: 12 },
  list:        { paddingBottom: 60 },
  listWide:    { paddingHorizontal: 8 },
  columnWrapper: { gap: 12, paddingHorizontal: 8, marginBottom: 8 },
});