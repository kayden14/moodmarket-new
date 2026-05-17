/**
 * app/vendor/products.tsx
 * Vendor product management — content only (Layout provided by _layout.tsx).
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import {
  upsertVendorProduct, deleteVendorProduct,
  toggleProductActive,
} from '@/services/vendorService';
import { useVendorProductsData } from '@/hooks/useVendorProductsData';
import { VendorProduct } from '@/types/vendor';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/services/storageService';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Search, Edit3, Trash2, Eye, EyeOff, Save, X, ImageIcon } from 'lucide-react-native';

const PRIMARY = '#FF7A8A';
type ProductForm = Omit<VendorProduct, 'id' | 'vendor_id' | 'created_at'>;
const EMPTY: ProductForm = { name: '', description: '', price: 0, image: '', mood_tags: [], rating: 4.5, stock_count: 0, is_active: true, category: null };

export default function VendorProducts() {
  const { profile } = useAuth();
  const { theme, isDark } = useTheme();
  const { products, loading, fetchProducts } = useVendorProductsData();
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<ProductForm>(EMPTY);
  const [tagsInput, setTagsInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const card = theme.card;
  const border = theme.border;
  const text = theme.textPrimary;
  const sub = theme.textSecondary;

  const openAdd = () => { setEditId(null); setForm(EMPTY); setTagsInput(''); setModalOpen(true); };
  const openEdit = (p: VendorProduct) => {
    setEditId(p.id); setTagsInput(p.mood_tags.join(', '));
    setForm({ name: p.name, description: p.description, price: p.price, image: p.image, mood_tags: p.mood_tags, rating: p.rating, stock_count: p.stock_count, is_active: p.is_active, category: p.category });
    setModalOpen(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8, base64: true });
    if (!r.canceled && r.assets[0]) {
      setUploading(true);
      try { const url = await uploadImage(r.assets[0].uri, false, r.assets[0].base64 || undefined); setForm(f => ({ ...f, image: url })); }
      catch (e: any) { Alert.alert('Upload failed', e.message); }
      finally { setUploading(false); }
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.description.trim() || form.price <= 0) { Alert.alert('Error', 'Required fields missing.'); return; }
    setSaving(true);
    try {
      await upsertVendorProduct(profile!.id, { ...form, mood_tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) }, editId ?? undefined);
      setModalOpen(false); fetchProducts();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const remove = (p: VendorProduct) => Alert.alert('Delete', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteVendorProduct(profile!.id, p.id); fetchProducts(); } },
  ]);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }: { item: VendorProduct }) => (
    <View style={[s.productCard, { backgroundColor: card, borderColor: border }]}>
      <Image source={{ uri: item.image }} style={s.productImg} contentFit="cover" transition={200} />
      <View style={s.productInfo}>
        <Text style={[s.productName, { color: text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.productPrice, { color: PRIMARY }]}>GH₵ {Number(item.price).toFixed(2)}</Text>
        <View style={s.badgeRow}>
          <View style={[s.statusBadge, { backgroundColor: item.is_active ? '#4ADE8015' : '#F8717115' }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: item.is_active ? '#4ADE80' : '#F87171' }}>
              {item.is_active ? 'ACTIVE' : 'HIDDEN'}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: sub }}>Stock: {item.stock_count}</Text>
        </View>
      </View>
      <View style={s.productActions}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: `${PRIMARY}15` }]} onPress={() => openEdit(item)}>
          <Edit3 size={18} color={PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.actionBtn, { backgroundColor: item.is_active ? '#F8717115' : '#4ADE8015' }]} 
          onPress={() => toggleProductActive(profile!.id, item.id, !item.is_active).then(fetchProducts)}
        >
          {item.is_active ? <EyeOff size={18} color="#F87171" /> : <Eye size={18} color="#4ADE80" />}
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F8717115' }]} onPress={() => remove(item)}>
          <Trash2 size={18} color="#F87171" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[s.toolBar, { backgroundColor: card, borderBottomColor: border }]}>
        <View style={[s.searchBox, { backgroundColor: isDark ? theme.background : '#F1F5F9', borderColor: border }]}>
          <Search size={18} color={sub} />
          <TextInput
            style={[s.searchInput, { color: text }]}
            placeholder="Search my products..."
            placeholderTextColor={sub}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Plus size={20} color="#fff" />
          <Text style={s.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[s.center, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          numColumns={Platform.OS === 'web' ? 2 : 1}
          key={Platform.OS === 'web' ? 'web' : 'mobile'}
        />
      )}

      {/* MODAL */}
      <Modal visible={modalOpen} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: card, borderColor: border }]}>
            <View style={[s.modalHeader, { borderBottomColor: border }]}>
              <Text style={[s.modalTitle, { color: text }]}>{editId ? 'Edit Product' : 'Add Product'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={24} color={sub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              <View style={[s.imageUpload, { borderColor: border, backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                {uploading ? (
                  <ActivityIndicator color={PRIMARY} />
                ) : form.image ? (
                  <View style={{ width: '100%', height: '100%' }}>
                    <Image source={{ uri: form.image }} style={s.uploadPreview} />
                    <TouchableOpacity 
                      style={s.removeImgBtn} 
                      onPress={() => setForm(f => ({ ...f, image: '' }))}
                    >
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={s.uploadPlaceholder} onPress={pickImage}>
                    <ImageIcon size={32} color={sub} />
                    <Text style={{ color: sub, marginTop: 8, fontSize: 13, fontWeight: '600' }}>Tap to upload image</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={s.dividerRow}>
                <View style={[s.divider, { backgroundColor: border }]} />
                <Text style={[s.dividerText, { color: sub }]}>OR USE URL</Text>
                <View style={[s.divider, { backgroundColor: border }]} />
              </View>

              <View style={s.field}>
                <Text style={[s.label, { color: sub }]}>IMAGE URL</Text>
                <TextInput 
                  style={[s.input, { color: text, borderColor: border }]} 
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={sub}
                  value={form.image} 
                  onChangeText={v => setForm(f => ({ ...f, image: v }))} 
                />
              </View>

              <View style={s.field}>
                <Text style={[s.label, { color: sub }]}>NAME *</Text>
                <TextInput style={[s.input, { color: text, borderColor: border }]} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
              </View>

              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: sub }]}>PRICE (GH₵) *</Text>
                  <TextInput style={[s.input, { color: text, borderColor: border }]} value={String(form.price)} onChangeText={v => setForm(f => ({ ...f, price: parseFloat(v) || 0 }))} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[s.label, { color: sub }]}>STOCK</Text>
                  <TextInput style={[s.input, { color: text, borderColor: border }]} value={String(form.stock_count)} onChangeText={v => setForm(f => ({ ...f, stock_count: parseInt(v) || 0 }))} keyboardType="numeric" />
                </View>
              </View>

              <View style={s.field}>
                <Text style={[s.label, { color: sub }]}>DESCRIPTION *</Text>
                <TextInput style={[s.input, { color: text, borderColor: border, height: 80 }]} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />
              </View>

              <View style={s.field}>
                <Text style={[s.label, { color: sub }]}>MOOD TAGS</Text>
                <TextInput style={[s.input, { color: text, borderColor: border }]} value={tagsInput} onChangeText={setTagsInput} placeholder="e.g. calm, happy" />
              </View>
            </ScrollView>

            <View style={[s.modalFooter, { borderTopColor: border }]}>
              <TouchableOpacity style={[s.cancelBtn, { borderColor: border }]} onPress={() => setModalOpen(false)}>
                <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Save size={18} color="#fff" />
                    <Text style={s.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolBar: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  searchBox: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  addBtn: { backgroundColor: PRIMARY, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, display: Platform.OS === 'web' ? 'flex' : 'none' },
  productCard: { flex: 1, margin: 8, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImg: { width: 64, height: 64, borderRadius: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  productPrice: { fontSize: 14, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  productActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalBody: { padding: 20, maxHeight: 500 },
  imageUpload: { height: 140, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  uploadPreview: { width: '100%', height: '100%' },
  uploadPlaceholder: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  removeImgBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontWeight: '800' },
  field: { marginBottom: 16 },
  fieldRow: { flexDirection: 'row', marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 14 },
  modalFooter: { padding: 20, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
  cancelBtn: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800' },
});
