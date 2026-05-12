/**
 * app/admin/products.tsx
 * Admin products — content only (Layout provided by _layout.tsx).
 */

import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
  Alert, Modal, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '@/services/supabase';
import { Image } from 'expo-image';
import { Plus, Search, Edit3, Trash2, X, Save, Camera, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/services/storageService';
import { useProductsData } from '@/hooks/useProductsData';
import { AdminProduct } from '@/types/admin';
import { useTheme } from '@/contexts/ThemeContext';

const PRIMARY = '#FF7A8A';
const EMPTY: Omit<AdminProduct, 'id'> = { name: '', description: '', price: 0, image: '', mood_tags: [], rating: 4.5, vendor_id: null, vendor_name: null };

export default function AdminProductsScreen() {
  const { isDark } = useTheme();
  const { products, loading, fetchProducts } = useProductsData();
  const [search,    setSearch]    = useState('');
  const [formOpen,  setFormOpen]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [form, setForm]       = useState<Omit<AdminProduct, 'id'>>(EMPTY);
  const [tagsInput, setTagsInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<AdminProduct | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const card   = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const text   = isDark ? '#F1F5F9' : '#0F172A';
  const sub    = isDark ? '#94A3B8' : '#64748B';

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd  = () => { setEditProduct(null); setForm(EMPTY); setTagsInput(''); setFormOpen(true); };
  const openEdit = (p: AdminProduct) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description, price: p.price, image: p.image, mood_tags: p.mood_tags, rating: p.rating, vendor_id: p.vendor_id, vendor_name: p.vendor_name });
    setTagsInput(p.mood_tags.join(', '));
    setFormOpen(true);
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need access to your gallery to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingImage(true);
      try {
        const url = await uploadImage(result.assets[0].uri);
        setForm(prev => ({ ...prev, image: url }));
      } catch (e: any) {
        Alert.alert('Upload failed', e.message);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim() || form.price <= 0) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { 
      name: form.name, 
      description: form.description, 
      price: form.price, 
      image: form.image, 
      mood_tags: tags, 
      rating: form.rating 
    };

    try {
      if (editProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
      setFormOpen(false);
      fetchProducts();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setDeleteConfirm(null);
    fetchProducts();
  };

  const renderItem = ({ item }: { item: AdminProduct }) => (
    <View style={[s.productCard, { backgroundColor: card, borderColor: border }]}>
      <Image source={{ uri: item.image }} style={s.productImg} contentFit="cover" transition={200} />
      <View style={s.productInfo}>
        <Text style={[s.productName, { color: text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.productVendor, { color: sub }]}>by {item.vendor_name || 'In-house'}</Text>
        <Text style={[s.productPrice, { color: PRIMARY }]}>GH₵{Number(item.price).toFixed(2)}</Text>
      </View>
      <View style={s.productActions}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: `${PRIMARY}15` }]} onPress={() => openEdit(item)}>
          <Edit3 size={18} color={PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F8717115' }]} onPress={() => setDeleteConfirm(item)}>
          <Trash2 size={18} color="#F87171" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Header / Search */}
      <View style={[s.toolBar, { backgroundColor: card, borderBottomColor: border }]}>
        <View style={[s.searchBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: border }]}>
          <Search size={18} color={sub} />
          <TextInput
            style={[s.searchInput, { color: text }]}
            placeholder="Search products..."
            placeholderTextColor={sub}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={18} color={sub} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Plus size={20} color="#fff" />
          <Text style={s.addBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
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

      {/* ADD/EDIT MODAL */}
      <Modal visible={formOpen} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContainer}>
            <View style={[s.modalContent, { backgroundColor: card, borderColor: border }]}>
              <View style={[s.modalHeader, { borderBottomColor: border }]}>
                <Text style={[s.modalTitle, { color: text }]}>{editProduct ? 'Edit Product' : 'Add New Product'}</Text>
                <TouchableOpacity onPress={() => setFormOpen(false)}>
                  <X size={24} color={sub} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s.modalBody}>
                {/* Image Upload */}
                <TouchableOpacity style={[s.imageUpload, { borderColor: border, backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]} onPress={handleImagePicker}>
                  {uploadingImage ? (
                    <ActivityIndicator color={PRIMARY} />
                  ) : form.image ? (
                    <Image source={{ uri: form.image }} style={s.uploadPreview} />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <ImageIcon size={32} color={sub} />
                      <Text style={{ color: sub, marginTop: 8, fontSize: 13, fontWeight: '600' }}>Click to upload image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={s.field}>
                  <Text style={[s.label, { color: sub }]}>PRODUCT NAME *</Text>
                  <TextInput
                    style={[s.input, { color: text, borderColor: border }]}
                    placeholder="e.g. Lavender Sleep Mask"
                    placeholderTextColor={sub}
                    value={form.name}
                    onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  />
                </View>

                <View style={s.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: sub }]}>PRICE (GH₵) *</Text>
                    <TextInput
                      style={[s.input, { color: text, borderColor: border }]}
                      placeholder="0.00"
                      placeholderTextColor={sub}
                      value={form.price ? String(form.price) : ''}
                      onChangeText={v => setForm(f => ({ ...f, price: parseFloat(v) || 0 }))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[s.label, { color: sub }]}>RATING (0-5)</Text>
                    <TextInput
                      style={[s.input, { color: text, borderColor: border }]}
                      placeholder="4.5"
                      placeholderTextColor={sub}
                      value={form.rating ? String(form.rating) : ''}
                      onChangeText={v => setForm(f => ({ ...f, rating: parseFloat(v) || 0 }))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={[s.label, { color: sub }]}>DESCRIPTION *</Text>
                  <TextInput
                    style={[s.input, { color: text, borderColor: border, height: 100, textAlignVertical: 'top' }]}
                    placeholder="Detailed product description..."
                    placeholderTextColor={sub}
                    value={form.description}
                    onChangeText={v => setForm(f => ({ ...f, description: v }))}
                    multiline
                  />
                </View>

                <View style={s.field}>
                  <Text style={[s.label, { color: sub }]}>MOOD TAGS (COMMA SEPARATED)</Text>
                  <TextInput
                    style={[s.input, { color: text, borderColor: border }]}
                    placeholder="calm, happy, sleep..."
                    placeholderTextColor={sub}
                    value={tagsInput}
                    onChangeText={setTagsInput}
                  />
                </View>
              </ScrollView>

              <View style={[s.modalFooter, { borderTopColor: border }]}>
                <TouchableOpacity style={[s.cancelBtn, { borderColor: border }]} onPress={() => setFormOpen(false)}>
                  <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Save size={18} color="#fff" />
                      <Text style={s.saveBtnText}>Save Product</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <Modal visible={true} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.confirmBox, { backgroundColor: card, borderColor: border }]}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🗑️</Text>
              <Text style={[s.confirmTitle, { color: text }]}>Delete Product?</Text>
              <Text style={[s.confirmSub, { color: sub }]}>
                Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity style={[s.cancelBtn, { flex: 1, borderColor: border }]} onPress={() => setDeleteConfirm(null)}>
                  <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, { flex: 1, backgroundColor: '#450A0A' }]} onPress={() => handleDelete(deleteConfirm)}>
                  <Text style={{ color: '#F87171', fontWeight: '800' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productCard: { flex: 1, margin: 8, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImg: { width: 64, height: 64, borderRadius: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  productVendor: { fontSize: 11, marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '800' },
  productActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, height: 44 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 16, height: 44 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', maxWidth: 600, maxHeight: '90%' },
  modalContent: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalBody: { padding: 20, maxHeight: 500 },
  imageUpload: { height: 160, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  uploadPreview: { width: '100%', height: '100%' },
  field: { marginBottom: 20 },
  fieldRow: { flexDirection: 'row', marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  modalFooter: { padding: 20, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
  cancelBtn: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  confirmBox: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  confirmSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});
derRadius: 12, borderWidth: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  confirmBox: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  confirmSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});
