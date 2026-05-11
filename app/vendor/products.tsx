/**
 * app/vendor/products.tsx
 * Vendor product management — CRUD scoped to vendor's own products.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import {
  getVendorProducts, upsertVendorProduct, deleteVendorProduct,
  toggleProductActive, updateStockCount,
} from '@/services/vendorService';
import type { VendorProduct } from '@/services/vendorService';
import { supabase } from '@/services/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const P = '#FF7A8A';
const BG = '#0F172A', CARD = '#1E293B', BORDER = '#334155', TEXT = '#F1F5F9', SUB = '#94A3B8';

type ProductForm = Omit<VendorProduct, 'id' | 'vendor_id' | 'created_at'>;
const EMPTY: ProductForm = { name: '', description: '', price: 0, image: '', mood_tags: [], rating: 4.5, stock_count: 0, is_active: true, category: null };

async function uploadImage(uri: string): Promise<string> {
  const path = `products/vendor_${Date.now()}.jpg`;
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const { error } = await supabase.storage.from('product-images').upload(path, decode(b64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

export default function VendorProducts() {
  const { profile } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<ProductForm>(EMPTY);
  const [tagsInput, setTagsInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const data = await getVendorProducts(profile.id);
    setProducts(data);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  useRealtimeChannel({
    channelName: `vendor-products-${profile?.id}`,
    table: 'products',
    filter: profile?.id ? `vendor_id=eq.${profile.id}` : undefined,
    onEvent: load,
    enabled: !!profile?.id,
  });

  const openAdd = () => { setEditId(null); setForm(EMPTY); setTagsInput(''); setModalOpen(true); };
  const openEdit = (p: VendorProduct) => {
    setEditId(p.id); setTagsInput(p.mood_tags.join(', '));
    setForm({ name: p.name, description: p.description, price: p.price, image: p.image, mood_tags: p.mood_tags, rating: p.rating, stock_count: p.stock_count, is_active: p.is_active, category: p.category });
    setModalOpen(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.85 });
    if (!r.canceled && r.assets[0]) {
      setUploading(true);
      try { const url = await uploadImage(r.assets[0].uri); setForm(f => ({ ...f, image: url })); }
      catch (e: any) { Alert.alert('Upload failed', e.message); }
      finally { setUploading(false); }
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.description.trim() || form.price <= 0) { Alert.alert('Error', 'Name, description and price are required.'); return; }
    setSaving(true);
    try {
      await upsertVendorProduct(profile!.id, { ...form, mood_tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) }, editId ?? undefined);
      setModalOpen(false); load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const remove = (p: VendorProduct) => Alert.alert('Delete', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteVendorProduct(profile!.id, p.id); load(); } },
  ]);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }: { item: VendorProduct }) => (
    <View style={[s.card, { backgroundColor: CARD, borderColor: BORDER }]}>
      <Image source={{ uri: item.image }} style={s.thumb} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <Text style={[s.name, { color: TEXT }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.price, { color: P }]}>GH₵ {Number(item.price).toFixed(2)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <View style={{ backgroundColor: item.is_active ? '#4ADE8022' : '#F8717122', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: item.is_active ? '#4ADE80' : '#F87171' }}>{item.is_active ? 'Active' : 'Hidden'}</Text>
          </View>
          <Text style={{ fontSize: 11, color: SUB }}>Stock: {item.stock_count}</Text>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#1D4ED822' }]} onPress={() => openEdit(item)}>
          <Text style={{ color: '#60A5FA', fontSize: 13 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#7F1D1D22' }]} onPress={() => remove(item)}>
          <Text style={{ color: '#F87171', fontSize: 13 }}>🗑️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: item.is_active ? '#F8717122' : '#4ADE8022' }]}
          onPress={() => toggleProductActive(profile!.id, item.id, !item.is_active).then(load)}>
          <Text style={{ fontSize: 13 }}>{item.is_active ? '👁️' : '🙈'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <View style={[s.header, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: TEXT, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: P, letterSpacing: 3 }}>VENDOR</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT }}>My Products</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: P, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={openAdd}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, margin: 14, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, height: 42 }}>
        <Text style={{ color: SUB, marginRight: 8 }}>🔍</Text>
        <TextInput style={{ flex: 1, fontSize: 14, color: TEXT }} placeholder="Search products…" placeholderTextColor={SUB} value={search} onChangeText={setSearch} />
      </View>

      {loading
        ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={P} size="large" /></View>
        : <FlatList data={filtered} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 14, paddingTop: 0 }} ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text><Text style={{ color: SUB }}>No products yet. Add your first one!</Text></View>} />
      }

      {/* Add / Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View style={[s.modalHeader, { backgroundColor: CARD, borderBottomColor: BORDER }]}>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={{ color: TEXT, fontSize: 22 }}>✕</Text></TouchableOpacity>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: TEXT }}>{editId ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity style={{ backgroundColor: P, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7, opacity: saving ? 0.6 : 1 }} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {/* Image picker */}
            <TouchableOpacity style={{ width: '100%', aspectRatio: 1.6, borderRadius: 14, backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 18 }} onPress={pickImage}>
              {form.image
                ? <Image source={{ uri: form.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                : <View style={{ alignItems: 'center', gap: 6 }}>
                    {uploading ? <ActivityIndicator color={P} /> : <><Text style={{ fontSize: 32 }}>📷</Text><Text style={{ color: SUB, fontSize: 13 }}>Tap to upload image</Text></>}
                  </View>
              }
            </TouchableOpacity>

            {[
              { label: 'Product Name *', key: 'name',        type: 'default' as const, placeholder: 'e.g. Rose Quartz Roller' },
              { label: 'Price (GH₵) *', key: 'price',       type: 'numeric' as const,  placeholder: '0.00' },
              { label: 'Stock Count',   key: 'stock_count',  type: 'numeric' as const,  placeholder: '0' },
              { label: 'Rating (0–5)',  key: 'rating',       type: 'numeric' as const,  placeholder: '4.5' },
              { label: 'Category',     key: 'category',     type: 'default' as const, placeholder: 'e.g. Skincare' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <Text style={s.label}>{f.label}</Text>
                <TextInput style={s.input} placeholder={f.placeholder} placeholderTextColor={SUB}
                  keyboardType={f.type} value={String((form as any)[f.key] === 0 ? '' : ((form as any)[f.key] ?? ''))}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: f.type === 'numeric' ? parseFloat(v) || 0 : v }))} />
              </View>
            ))}

            <View style={{ marginBottom: 14 }}>
              <Text style={s.label}>Description *</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Describe your product…" placeholderTextColor={SUB} value={form.description} multiline onChangeText={v => setForm(f => ({ ...f, description: v }))} />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={s.label}>Mood Tags (comma separated)</Text>
              <TextInput style={s.input} placeholder="happy, calm, excited…" placeholderTextColor={SUB} value={tagsInput} onChangeText={setTagsInput} />
            </View>

            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: form.is_active ? '#4ADE8018' : '#F8717118', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: form.is_active ? '#4ADE8044' : '#F8717144', marginBottom: 40 }}
              onPress={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
              <Text style={{ fontSize: 18 }}>{form.is_active ? '👁️' : '🙈'}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: form.is_active ? '#4ADE80' : '#F87171' }}>{form.is_active ? 'Visible in store' : 'Hidden from store'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  card:        { flexDirection: 'row', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, gap: 12, alignItems: 'center' },
  thumb:       { width: 64, height: 64, borderRadius: 10 },
  name:        { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  price:       { fontSize: 13, fontWeight: '800' },
  btn:         { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  label:       { fontSize: 11, fontWeight: '700', color: SUB, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input:       { backgroundColor: CARD, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER },
});
