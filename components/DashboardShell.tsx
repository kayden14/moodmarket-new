/**
 * components/DashboardShell.tsx
 *
 * Responsive dashboard shell for Admin and Vendor portals.
 * Features:
 *  - Persistent sidebar on desktop
 *  - Collapsible drawer on mobile
 *  - Unified header with user profile and theme toggle
 */

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Menu, X, LogOut, Sun, Moon } from 'lucide-react-native';

export interface NavItem {
  icon: string;
  label: string;
  path: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  navItems: NavItem[];
  portalName: string;
  primaryColor?: string;
}

export default function DashboardShell({
  children,
  title,
  navItems,
  portalName,
  primaryColor = '#FF7A8A',
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { profile, signOut } = useAuth();
  const { isDark, toggleDark } = useTheme();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(width >= 1024);
  const isDesktop = width >= 1024;

  useEffect(() => {
    setIsSidebarOpen(width >= 1024);
  }, [width]);

  const bg = isDark ? '#0F172A' : '#F1F5F9';
  const sidebarBg = isDark ? '#111827' : '#FFFFFF';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const text = isDark ? '#F1F5F9' : '#0F172A';
  const subtext = isDark ? '#94A3B8' : '#64748B';

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const SidebarContent = () => (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Brand */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{portalName === 'Admin' ? '🛡️' : '🏪'}</Text>
        </View>
        <View>
          <Text style={{ fontWeight: '900', color: text, fontSize: 16 }}>MoodMarket</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor, letterSpacing: 1 }}>{portalName.toUpperCase()} PORTAL</Text>
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <TouchableOpacity
              key={item.path}
              onPress={() => {
                router.push(item.path as any);
                if (!isDesktop) setIsSidebarOpen(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                marginBottom: 4,
                backgroundColor: isActive ? `${primaryColor}15` : 'transparent',
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 12 }}>{item.icon}</Text>
              <Text style={{ 
                fontWeight: isActive ? '800' : '600', 
                color: isActive ? primaryColor : subtext,
                fontSize: 14 
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 20, gap: 10 }}>
        <TouchableOpacity 
          onPress={toggleDark}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}
        >
          {isDark ? <Sun size={18} color={subtext} /> : <Moon size={18} color={subtext} />}
          <Text style={{ color: subtext, fontWeight: '600', fontSize: 14 }}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleSignOut}
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: 12, 
            gap: 12, 
            backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? '#7F1D1D' : '#FECACA'
          }}
        >
          <LogOut size={18} color={isDark ? '#FCA5A5' : '#EF4444'} />
          <Text style={{ color: isDark ? '#FCA5A5' : '#EF4444', fontWeight: '700', fontSize: 14 }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, flexDirection: 'row' }}>
      {/* Sidebar Desktop */}
      {isDesktop && (
        <View style={{ width: 260, backgroundColor: sidebarBg, borderRightWidth: 1, borderRightColor: border }}>
          <SidebarContent />
        </View>
      )}

      {/* Mobile Sidebar Overlay */}
      {!isDesktop && isSidebarOpen && (
        <View style={{ position: 'absolute', inset: 0, zIndex: 100, flexDirection: 'row' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} 
            onPress={() => setIsSidebarOpen(false)} 
          />
          <View style={{ width: 280, backgroundColor: sidebarBg, height: '100%' }}>
            <SidebarContent />
          </View>
        </View>
      )}

      {/* Main Content */}
      <View style={{ flex: 1, flexBasis: 0 }}>
        {/* Header */}
        <View style={{ 
          height: 64, 
          backgroundColor: sidebarBg, 
          borderBottomWidth: 1, 
          borderBottomColor: border, 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: 20
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!isDesktop && (
              <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
                <Menu size={24} color={text} />
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 20, fontWeight: '900', color: text }}>{title}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ alignItems: 'flex-end', display: isDesktop ? 'flex' : 'none' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{profile?.name || 'User'}</Text>
              <Text style={{ fontSize: 11, color: subtext }}>{profile?.role?.toUpperCase() || portalName.toUpperCase()}</Text>
            </View>
            <View style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 18, 
              backgroundColor: `${primaryColor}22`, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Text style={{ color: primaryColor, fontWeight: '800', fontSize: 14 }}>
                {(profile?.name || 'U')[0].toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Area */}
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </View>
    </View>
  );
}
