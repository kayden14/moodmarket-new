/**
 * app/admin/products.tsx
 * Admin products — both platforms in one file.
 *  - Mobile: FlatList + Modal layout (dark theme) + expo-image-picker
 *  - Web:    full-page grid with slide-in add/edit form panel + file upload / webcam
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, StatusBar,
  Alert, Modal, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Image } from 'expo-image';
import { ArrowLeft, Plus, Search, Edit3, Trash2, X, Save, Camera, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const PRIMARY = '#FF7A8A';
const BG = '#0F172A'; const CARD = '#1E293B'; const BORDER = '#334155';
const TEXT = '#F1F5F9'; const SUBTEXT = '#94A3B8';

interface Product {
  id: string; name: string; description: string;
  price: number; image: string; mood_tags: string[]; rating: number;
  vendor_id?: string | null;
  vendor_name?: string | null; // resolved from profiles join
}
const EMPTY: Omit<Product, 'id'> = { name: '', description: '', price: 0, image: '', mood_tags: [], rating: 4.5, vendor_id: null, vendor_name: null };

/* ─── Upload image to Supabase Storage ─── */
async function uploadImageToSupabase(uri: string, isBase64Web?: boolean, base64Data?: string): Promise<string> {
  const fileName = `product_${Date.now()}.jpg`;
  const filePath = `products/${fileName}`;

  if (isBase64Web && base64Data) {
    // Web: base64 string
    const base64 = base64Data.split(',')[1];
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  } else {
    // Mobile: local file URI
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return data.publicUrl;
}

/* ─── shared data hook ─── */
function useProductsData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, profiles!vendor_id(name, store_name)')
      .order('created_at', { ascending: false });
    if (error) console.error('[Admin Products]', error.message);
    if (data) setProducts(data.map((p: any) => ({
      ...p,
      vendor_name: p.profiles?.store_name || p.profiles?.name || null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, []);
  return { products, loading, fetchProducts };
}

/* ─────────────────────────────────────────────────────────────────────────
   WEB VERSION
───────────────────────────────────────────────────────────────────────── */

function AdminProductsWeb() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const { products, loading, fetchProducts } = useProductsData();
  const [search,    setSearch]    = useState('');
  const [formOpen,  setFormOpen]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm]       = useState<Omit<Product, 'id'>>(EMPTY);
  const [tagsInput, setTagsInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  // Image picker state
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [webcamActive,    setWebcamActive]    = useState(false);
  const [uploadingImage,  setUploadingImage]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);

  const bg     = isDark ? '#0B0F1A' : '#F1F5F9';
  const sidebar = isDark ? '#111827' : '#1E293B';
  const card   = isDark ? '#1A2236' : '#FFFFFF';
  const border = isDark ? '#1F2D42' : '#E2E8F0';
  const text   = isDark ? '#F1F5F9' : '#0F172A';
  const sub    = '#64748B';

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd  = () => { setEditProduct(null); setForm(EMPTY); setTagsInput(''); setFormOpen(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description, price: p.price, image: p.image, mood_tags: p.mood_tags, rating: p.rating });
    setTagsInput(p.mood_tags.join(', '));
    setFormOpen(true);
  };

  // ── Webcam helpers ──
  const startWebcam = async () => {
    try {
      const stream = await (navigator as any).mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setWebcamActive(true);
      // attach stream after element renders
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch { alert('Could not access camera. Please allow camera permissions.'); }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopWebcam();
    setImagePickerOpen(false);
    setUploadingImage(true);
    try {
      const url = await uploadImageToSupabase('', true, dataUrl);
      setForm(prev => ({ ...prev, image: url }));
    } catch (e: any) { alert('Upload failed: ' + e.message); }
    finally { setUploadingImage(false); }
  };

  // ── File input handler ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePickerOpen(false);
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const url = await uploadImageToSupabase('', true, dataUrl);
        setForm(prev => ({ ...prev, image: url }));
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) { alert('Upload failed: ' + e.message); setUploadingImage(false); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim() || form.price <= 0) { alert('Please fill in all required fields.'); return; }
    setSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { ...form, mood_tags: tags };
    try {
      if (editProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
      setFormOpen(false); fetchProducts();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (product: Product) => {
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) { alert(error.message); return; }
    setDeleteConfirm(null); fetchProducts();
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Plus Jakarta Sans', sans-serif; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
    @keyframes ap-spin    { to { transform: rotate(360deg); } }
    @keyframes ap-slidein { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @keyframes ap-confirm { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
    @keyframes ap-fadein  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .ap-nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 14px; border-radius: 12px; border: none; background: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #64748B; transition: all .15s; width: 100%; }
    .ap-nav-item:hover { background: rgba(255,255,255,.06); color: #94A3B8; }
    .ap-nav-item.active { background: ${PRIMARY}18; color: ${PRIMARY}; font-weight: 800; }

    .ap-product-card { background: ${card}; border: 1px solid ${border}; border-radius: 14px; overflow: hidden; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
    .ap-product-card:hover { transform: translateY(-3px); box-shadow: ${isDark ? '0 12px 36px rgba(0,0,0,.5)' : '0 12px 36px rgba(0,0,0,.1)'}; }

    .ap-form-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 480px; background: ${card}; border-left: 1px solid ${border}; z-index: 300; overflow-y: auto; animation: ap-slidein .28s cubic-bezier(.4,0,.2,1) both; box-shadow: -8px 0 40px rgba(0,0,0,.35); }
    .ap-backdrop { position: fixed; inset: 0; z-index: 299; background: rgba(0,0,0,.45); backdrop-filter: blur(3px); }

    .ap-field-label { font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: ${sub}; margin-bottom: 6px; display: block; }
    .ap-input { width: 100%; background: ${isDark ? '#0B0F1A' : '#F8FAFC'}; border: 1.5px solid ${border}; border-radius: 11px; padding: 12px 14px; font-size: 14px; color: ${text}; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border-color .18s; }
    .ap-input:focus { border-color: ${PRIMARY}; }
    .ap-input::placeholder { color: ${isDark ? '#334155' : '#CBD5E1'}; }

    .ap-btn { display: flex; align-items: center; gap: 7px; border: none; border-radius: 10px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 13px; transition: all .15s; }
    .ap-btn:hover { opacity: .85; transform: translateY(-1px); }
    .ap-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    .ap-confirm-modal { position: fixed; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.6); backdrop-filter: blur(6px); }
    .ap-confirm-box { background: ${card}; border: 1px solid ${border}; border-radius: 20px; padding: 28px; max-width: 380px; width: 90%; animation: ap-confirm .22s ease both; font-family: 'Plus Jakarta Sans', sans-serif; }

    .ap-tag { display: inline-flex; align-items: center; background: ${PRIMARY}18; border-radius: 7px; padding: 3px 9px; font-size: 11px; font-weight: 700; color: ${PRIMARY}; margin: 2px; }

    /* Image picker modal */
    .ap-img-modal { position: fixed; inset: 0; z-index: 400; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,.6); backdrop-filter: blur(6px); }
    .ap-img-sheet { background: ${card}; border: 1px solid ${border}; border-radius: 24px 24px 0 0; padding: 28px 24px 32px; width: 100%; max-width: 480px; animation: ap-fadein .22s ease both; font-family: 'Plus Jakarta Sans', sans-serif; }
    .ap-img-option { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; border: 1.5px solid ${border}; cursor: pointer; transition: all .15s; background: none; width: 100%; font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 10px; }
    .ap-img-option:hover { border-color: ${PRIMARY}; background: ${PRIMARY}12; }
    .ap-img-option-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }

    /* Webcam */
    .ap-webcam-modal { position: fixed; inset: 0; z-index: 450; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,.9); }
    .ap-webcam-video { width: min(100vw, 560px); aspect-ratio: 4/3; border-radius: 16px; object-fit: cover; background: #000; }

    /* Image upload zone */
    .ap-upload-zone { border: 2px dashed ${border}; border-radius: 13px; aspect-ratio: 16/9; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all .18s; position: relative; overflow: hidden; }
    .ap-upload-zone:hover { border-color: ${PRIMARY}; background: ${PRIMARY}08; }

    @media (max-width: 900px) { .ap-grid { grid-template-columns: repeat(2, 1fr) !important; } }
    @media (max-width: 600px) { .ap-grid { grid-template-columns: 1fr !important; } .ap-form-panel { width: 100% !important; } }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* Hidden file input */}
      <input ref={fileInputRef as any} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange as any} />

      <div style={{ display: 'flex', height: '100vh', background: bg, fontFamily: '"Plus Jakarta Sans", sans-serif', overflow: 'hidden' }}>

        {/* SIDEBAR */}
        <aside style={{ width: 200, background: sidebar, borderRight: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '18px 14px', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🛡️</div>
            <span style={{ fontFamily: '"Fraunces", serif', fontSize: 15, fontWeight: 700, color: '#F1F5F9', letterSpacing: -.2 }}>Admin Portal</span>
          </div>
          <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: '🏠', label: 'Dashboard', path: '/admin'           },
              { icon: '📦', label: 'Products',  path: '/admin/products', active: true },
              { icon: '🛒', label: 'Orders',    path: '/admin/orders'   },
              { icon: '🏪', label: 'Vendors',   path: '/admin/vendors'  },
              { icon: '👥', label: 'Users',     path: '/admin/users'    },
            ].map(item => (
              <button key={item.path} className={`ap-nav-item${(item as any).active ? ' active' : ''}`} onClick={() => router.push(item.path as any)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: `1px solid ${isDark ? '#1F2D42' : '#1E3A5F'}`, paddingTop: 8 }}>
              <button className="ap-nav-item" onClick={() => router.push('/(tabs)' as any)}><span style={{ fontSize: 16 }}>🏪</span>View store</button>
              <button className="ap-nav-item" style={{ color: '#F87171' }} onClick={async () => { await supabase.auth.signOut(); router.replace('/admin/login' as any); }}><span style={{ fontSize: 16 }}>🚪</span>Sign out</button>
            </div>
          </nav>
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* topbar */}
          <header style={{ height: 60, background: isDark ? '#111827' : '#1E293B', borderBottom: `1px solid ${isDark ? '#1F2D42' : '#334155'}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
            <button onClick={() => router.push('/admin' as any)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 18, padding: 4 }}>←</button>
            <div style={{ fontFamily: '"Fraunces", serif', fontSize: 19, fontWeight: 700, color: '#F1F5F9' }}>Products</div>
            <span style={{ fontSize: 12, color: sub, background: border, borderRadius: 8, padding: '3px 9px' }}>{products.length} total</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setIsDark(v => !v)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>{isDark ? '☀️' : '🌙'}</button>
            <button className="ap-btn" onClick={openAdd} style={{ background: PRIMARY, color: '#fff', padding: '8px 16px', boxShadow: `0 4px 14px ${PRIMARY}44` }}>
              <span>＋</span> Add Product
            </button>
          </header>

          {/* search bar */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, background: card, flexShrink: 0 }}>
            <div style={{ position: 'relative', maxWidth: 360 }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: sub, pointerEvents: 'none' }}>🔍</span>
              <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="ap-input" style={{ paddingLeft: 40, height: 42 }} />
            </div>
          </div>

          {/* grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 60px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${border}`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'ap-spin .8s linear infinite' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
                <span style={{ fontSize: 48 }}>📦</span>
                <p style={{ color: sub, fontSize: 14 }}>No products found</p>
                <button className="ap-btn" onClick={openAdd} style={{ background: PRIMARY, color: '#fff', padding: '10px 20px' }}>Add your first product</button>
              </div>
            ) : (
              <div className="ap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {filtered.map(product => (
                  <div key={product.id} className="ap-product-card">
                    <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: isDark ? '#0B0F1A' : '#F8FAFC' }}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📦</div>
                      )}
                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(product)} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(29,78,216,.85)', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>✏️</button>
                        <button onClick={() => setDeleteConfirm(product)} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(127,29,29,.85)', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 600, color: PRIMARY, marginBottom: 6 }}>GH₵{Number(product.price).toFixed(2)}</div>
                      {product.vendor_name && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#38BDF818', border: '1px solid #38BDF833', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#38BDF8', marginBottom: 6 }}>🏪 {product.vendor_name}</div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {product.mood_tags.slice(0, 3).map(tag => <span key={tag} className="ap-tag">{tag}</span>)}
                        {product.mood_tags.length > 3 && <span className="ap-tag">+{product.mood_tags.length - 3}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FORM PANEL */}
        {formOpen && (
          <>
            <div className="ap-backdrop" onClick={() => setFormOpen(false)} />
            <div className="ap-form-panel">
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12, background: isDark ? '#111827' : '#F8FAFC', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => setFormOpen(false)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                <div style={{ fontFamily: '"Fraunces", serif', fontSize: 18, fontWeight: 700, color: text }}>{editProduct ? 'Edit Product' : 'Add Product'}</div>
                <button className="ap-btn" onClick={handleSave} disabled={saving}
                  style={{ marginLeft: 'auto', background: PRIMARY, color: '#fff', padding: '8px 18px', boxShadow: `0 4px 14px ${PRIMARY}44`, opacity: saving ? .6 : 1 }}
                >
                  {saving ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'ap-spin .7s linear infinite' }} /> : '💾 Save'}
                </button>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* ── IMAGE SECTION ── */}
                <div>
                  <label className="ap-field-label">Product Image</label>
                  {/* Upload zone / preview */}
                  <div className="ap-upload-zone" onClick={() => !uploadingImage && setImagePickerOpen(true)}
                    style={{ background: isDark ? '#0B0F1A' : '#F8FAFC', cursor: uploadingImage ? 'wait' : 'pointer' }}
                  >
                    {uploadingImage ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, border: `3px solid ${border}`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'ap-spin .8s linear infinite' }} />
                        <span style={{ fontSize: 12, color: sub }}>Uploading…</span>
                      </div>
                    ) : form.image ? (
                      <>
                        <img src={form.image} alt="Preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .18s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, background: 'rgba(0,0,0,.5)', borderRadius: 8, padding: '6px 12px' }}>📷 Change Image</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 32 }}>📷</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: text }}>Add Product Image</span>
                        <span style={{ fontSize: 11, color: sub }}>Click to take a photo or upload from gallery</span>
                      </>
                    )}
                  </div>

                  {/* or use URL manually */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 6px' }}>
                    <div style={{ flex: 1, height: 1, background: border }} />
                    <span style={{ fontSize: 11, color: sub, fontWeight: 600 }}>or paste URL</span>
                    <div style={{ flex: 1, height: 1, background: border }} />
                  </div>
                  <input type="url" placeholder="https://…" value={form.image} className="ap-input"
                    onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))} style={{ color: text }} />
                </div>

                {[
                  { label: 'Product Name *', key: 'name',   type: 'text',   placeholder: 'e.g. Rose Quartz Roller' },
                  { label: 'Price (GH₵) *', key: 'price',  type: 'number', placeholder: '0.00' },
                  { label: 'Rating (0–5)',   key: 'rating', type: 'number', placeholder: '4.5'  },
                ].map(field => (
                  <div key={field.key}>
                    <label className="ap-field-label">{field.label}</label>
                    <input type={field.type} placeholder={field.placeholder} value={(form as any)[field.key] === 0 ? '' : (form as any)[field.key]} className="ap-input"
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      style={{ color: text }}
                    />
                  </div>
                ))}

                <div>
                  <label className="ap-field-label">Description *</label>
                  <textarea placeholder="Product description…" value={form.description} className="ap-input"
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    style={{ height: 100, resize: 'vertical', lineHeight: 1.6, color: text }}
                  />
                </div>

                <div>
                  <label className="ap-field-label">Mood Tags (comma separated)</label>
                  <input type="text" placeholder="happy, calm, excited, self-care…" value={tagsInput} className="ap-input"
                    onChange={e => setTagsInput(e.target.value)} style={{ color: text }}
                  />
                  {tagsInput && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map(tag => <span key={tag} className="ap-tag">{tag}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* IMAGE PICKER BOTTOM SHEET */}
        {imagePickerOpen && (
          <div className="ap-img-modal" onClick={() => setImagePickerOpen(false)}>
            <div className="ap-img-sheet" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: '"Fraunces", serif', fontSize: 18, fontWeight: 700, color: text }}>Add Image</span>
                <button onClick={() => setImagePickerOpen(false)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 9, width: 30, height: 30, cursor: 'pointer', color: sub, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              {/* Take photo */}
              <button className="ap-img-option" onClick={() => { setImagePickerOpen(false); startWebcam(); }}>
                <div className="ap-img-option-icon" style={{ background: `${PRIMARY}20` }}>📷</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text }}>Take a Photo</div>
                  <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>Use your device camera</div>
                </div>
              </button>

              {/* Upload from gallery */}
              <button className="ap-img-option" onClick={() => { fileInputRef.current?.click(); setImagePickerOpen(false); }}>
                <div className="ap-img-option-icon" style={{ background: '#3B82F620' }}>🖼️</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text }}>Choose from Gallery</div>
                  <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>Upload a file from your device</div>
                </div>
              </button>

              <button onClick={() => setImagePickerOpen(false)} style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'none', border: `1px solid ${border}`, color: sub, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13, marginTop: 4 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* WEBCAM OVERLAY */}
        {webcamActive && (
          <div className="ap-webcam-modal">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 'min(100vw, 560px)' }}>
                <span style={{ fontFamily: '"Fraunces", serif', fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>Take Photo</span>
                <button onClick={stopWebcam} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 9, width: 34, height: 34, cursor: 'pointer', color: '#94A3B8', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
              <video ref={videoRef as any} autoPlay playsInline className="ap-webcam-video" />
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={stopWebcam} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: '#94A3B8', fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 14 }}>Cancel</button>
                <button onClick={capturePhoto} style={{ padding: '12px 32px', borderRadius: 12, background: PRIMARY, border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 14, boxShadow: `0 4px 18px ${PRIMARY}55` }}>📸 Capture</button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRM */}
        {deleteConfirm && (
          <div className="ap-confirm-modal">
            <div className="ap-confirm-box">
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontFamily: '"Fraunces", serif', fontSize: 20, fontWeight: 900, color: text, marginBottom: 8 }}>Delete Product?</div>
              <div style={{ fontSize: 14, color: sub, lineHeight: 1.6, marginBottom: 24 }}>
                Are you sure you want to delete <strong style={{ color: text }}>{deleteConfirm.name}</strong>? This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '11px', borderRadius: 11, background: 'none', border: `1px solid ${border}`, color: text, fontWeight: 700, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13 }}>Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '11px', borderRadius: 11, background: '#450A0A', border: '1px solid #7F1D1D', color: '#F87171', fontWeight: 800, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13 }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE VERSION
───────────────────────────────────────────────────────────────────────── */

function AdminProductsMobile() {
  const router = useRouter();
  const { products, loading, fetchProducts } = useProductsData();
  const [search,    setSearch]    = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'>>(EMPTY);
  const [tagsInput, setTagsInput] = useState('');

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd  = () => { setEditProduct(null); setForm(EMPTY); setTagsInput(''); setModalOpen(true); };
  const openEdit = (product: Product) => {
    setEditProduct(product);
    setForm({ name: product.name, description: product.description, price: product.price, image: product.image, mood_tags: product.mood_tags, rating: product.rating });
    setTagsInput(product.mood_tags.join(', '));
    setModalOpen(true);
  };

  // ── Image picking helpers ──
  const requestPermission = async (type: 'camera' | 'gallery') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
  };

  const pickFromGallery = async () => {
    const granted = await requestPermission('gallery');
    if (!granted) { Alert.alert('Permission required', 'Please allow access to your photo library in Settings.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      await handleImageSelected(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const granted = await requestPermission('camera');
    if (!granted) { Alert.alert('Permission required', 'Please allow camera access in Settings.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      await handleImageSelected(result.assets[0].uri);
    }
  };

  const handleImageSelected = async (uri: string) => {
    setUploadingImage(true);
    try {
      const url = await uploadImageToSupabase(uri);
      setForm(prev => ({ ...prev, image: url }));
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Product Image', 'Choose an option', [
      { text: '📷 Take Photo',         onPress: takePhoto     },
      { text: '🖼️ Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim())        { Alert.alert('Error', 'Product name is required.'); return; }
    if (!form.description.trim()) { Alert.alert('Error', 'Description is required.'); return; }
    if (form.price <= 0)          { Alert.alert('Error', 'Price must be greater than 0.'); return; }
    setSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { ...form, mood_tags: tags };
    try {
      if (editProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
      setModalOpen(false); fetchProducts();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (product: Product) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('products').delete().eq('id', product.id);
        if (error) { Alert.alert('Error', error.message); return; }
        fetchProducts();
      }},
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={[pc.card, { backgroundColor: CARD, borderColor: BORDER }]}>
      <Image source={{ uri: item.image }} style={pc.image} contentFit="cover" />
      <View style={pc.info}>
        <Text style={pc.name} numberOfLines={1}>{item.name}</Text>
        <Text style={pc.price}>GH₵ {Number(item.price).toFixed(2)}</Text>
        <Text style={pc.tags} numberOfLines={1}>{item.mood_tags.join(', ')}</Text>
      </View>
      <View style={pc.actions}>
        <TouchableOpacity style={[pc.btn, { backgroundColor: '#1D4ED822' }]} onPress={() => openEdit(item)}><Edit3 size={14} color="#60A5FA" strokeWidth={2} /></TouchableOpacity>
        <TouchableOpacity style={[pc.btn, { backgroundColor: '#7F1D1D22', marginTop: 6 }]} onPress={() => handleDelete(item)}><Trash2 size={14} color="#F87171" strokeWidth={2} /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <View style={ms.header}>
        <TouchableOpacity style={ms.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={TEXT} strokeWidth={2.2} /></TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={ms.headerEye}>ADMIN</Text>
          <Text style={ms.headerTitle}>Products</Text>
        </View>
        <TouchableOpacity style={ms.addBtn} onPress={openAdd}><Plus size={18} color="#fff" strokeWidth={2.5} /><Text style={ms.addBtnTxt}>Add</Text></TouchableOpacity>
      </View>
      <View style={ms.searchRow}><Search size={16} color={SUBTEXT} style={{ marginRight: 8 }} /><TextInput style={ms.searchInput} placeholder="Search products…" placeholderTextColor={SUBTEXT} value={search} onChangeText={setSearch} /></View>
      <Text style={ms.count}>{filtered.length} products</Text>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderProduct} contentContainerStyle={{ padding: 16, paddingTop: 4 }} showsVerticalScrollIndicator={false} />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={mm.header}>
            <TouchableOpacity onPress={() => setModalOpen(false)}><X size={22} color={TEXT} strokeWidth={2} /></TouchableOpacity>
            <Text style={mm.title}>{editProduct ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity style={[mm.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={14} color="#fff" /><Text style={mm.saveTxt}>Save</Text></>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={mm.scroll} keyboardShouldPersistTaps="handled">

            {/* ── IMAGE PICKER ── */}
            <View style={mm.fieldWrap}>
              <Text style={mm.label}>Product Image</Text>
              <TouchableOpacity style={mm.imagePicker} onPress={showImageOptions} activeOpacity={0.8}>
                {uploadingImage ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={{ color: SUBTEXT, fontSize: 12 }}>Uploading…</Text>
                  </View>
                ) : form.image ? (
                  <>
                    <Image source={{ uri: form.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={mm.imageOverlay}>
                      <Camera size={20} color="#fff" strokeWidth={2} />
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Change Image</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Camera size={32} color={SUBTEXT} strokeWidth={1.5} />
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>Add Photo</Text>
                    <Text style={{ color: SUBTEXT, fontSize: 11 }}>Tap to take a photo or choose from gallery</Text>
                  </View>
                )}
              </TouchableOpacity>
              {/* Quick action buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={mm.quickBtn} onPress={takePhoto}>
                  <Camera size={14} color={PRIMARY} strokeWidth={2} />
                  <Text style={mm.quickBtnTxt}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={mm.quickBtn} onPress={pickFromGallery}>
                  <ImageIcon size={14} color={PRIMARY} strokeWidth={2} />
                  <Text style={mm.quickBtnTxt}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {[
              { label: 'Product Name *', value: form.name, key: 'name', placeholder: 'e.g. Rose Quartz Roller' },
              { label: 'Price (GH₵) *', value: String(form.price === 0 ? '' : form.price), key: 'price', placeholder: '0.00', keyboard: 'numeric' },
              { label: 'Rating (0-5)',   value: String(form.rating === 0 ? '' : form.rating), key: 'rating', placeholder: '4.5', keyboard: 'numeric' },
            ].map(field => (
              <View key={field.key} style={mm.fieldWrap}>
                <Text style={mm.label}>{field.label}</Text>
                <TextInput style={mm.input} placeholder={field.placeholder} placeholderTextColor={SUBTEXT} value={field.value}
                  onChangeText={v => setForm(prev => ({ ...prev, [field.key]: field.key === 'price' || field.key === 'rating' ? parseFloat(v) || 0 : v }))}
                  keyboardType={(field as any).keyboard ?? 'default'}
                />
              </View>
            ))}
            <View style={mm.fieldWrap}>
              <Text style={mm.label}>Description *</Text>
              <TextInput style={[mm.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Product description…" placeholderTextColor={SUBTEXT} value={form.description} onChangeText={v => setForm(prev => ({ ...prev, description: v }))} multiline />
            </View>
            <View style={mm.fieldWrap}>
              <Text style={mm.label}>Mood Tags (comma separated)</Text>
              <TextInput style={mm.input} placeholder="happy, calm, excited…" placeholderTextColor={SUBTEXT} value={tagsInput} onChangeText={setTagsInput} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function AdminProductsScreen() {
  if (Platform.OS === 'web') return <AdminProductsWeb />;
  return <AdminProductsMobile />;
}

/* ─── Shared StyleSheets ─── */
const pc = StyleSheet.create({
  card:    { flexDirection: 'row', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, gap: 12, alignItems: 'center' },
  image:   { width: 60, height: 60, borderRadius: 10 },
  info:    { flex: 1, gap: 3 },
  name:    { fontSize: 13, fontWeight: '700', color: TEXT },
  price:   { fontSize: 13, fontWeight: '800', color: PRIMARY },
  tags:    { fontSize: 11, color: SUBTEXT },
  actions: {},
  btn:     { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
});
const ms = StyleSheet.create({
  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, justifyContent: 'center', alignItems: 'center' },
  headerEye:   { fontSize: 9, fontWeight: '800', color: PRIMARY, letterSpacing: 3, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: TEXT, letterSpacing: -0.5 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnTxt:   { fontSize: 13, fontWeight: '700', color: '#fff' },
  searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, margin: 16, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },
  count:       { fontSize: 11, color: SUBTEXT, paddingHorizontal: 16, marginBottom: 4, fontWeight: '600' },
});
const mm = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:        { fontSize: 17, fontWeight: '800', color: TEXT },
  saveBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  saveTxt:      { fontSize: 13, fontWeight: '700', color: '#fff' },
  scroll:       { padding: 20 },
  fieldWrap:    { marginBottom: 16 },
  label:        { fontSize: 11, fontWeight: '700', color: SUBTEXT, marginBottom: 6, letterSpacing: 0.5 },
  input:        { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER },
  imagePicker:  { width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  quickBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: `${PRIMARY}15`, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: `${PRIMARY}30` },
  quickBtnTxt:  { fontSize: 12, fontWeight: '700', color: PRIMARY },
});