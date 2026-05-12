import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Menu, X, LogOut, Sun, Moon, Bell, Search, User } from 'lucide-react-native';

export interface NavItem {
  icon: string;
  label: string;
  path: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  portalName: string;
  primaryColor?: string;
  actions?: React.ReactNode;
}

export default function DashboardShell({
  children,
  title,
  subtitle,
  navItems,
  portalName,
  primaryColor = '#FF7A8A',
  actions,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(width >= 1024);
  const isDesktop = width >= 1024;

  useEffect(() => {
    setIsSidebarOpen(width >= 1024);
  }, [width]);

  const bg = isDark ? '#0F172A' : '#F8FAFC';
  const sidebarBg = isDark ? '#111827' : '#FFFFFF';
  const headerBg = isDark ? '#111827' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const text = isDark ? '#F1F5F9' : '#0F172A';
  const subtext = isDark ? '#94A3B8' : '#64748B';

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const SidebarContent = () => (
    <View style={{ flex: 1, padding: 24 }}>
      {/* Brand */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center', shadowColor: primaryColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <Text style={{ fontSize: 22 }}>{portalName === 'Admin' ? '🛡️' : '🏪'}</Text>
        </View>
        <View>
          <Text style={{ fontWeight: '900', color: text, fontSize: 18, letterSpacing: -0.5 }}>MoodMarket</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: primaryColor, letterSpacing: 1.5, textTransform: 'uppercase' }}>{portalName}</Text>
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: subtext, letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' }}>Main Menu</Text>
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
                padding: 14,
                borderRadius: 12,
                marginBottom: 4,
                backgroundColor: isActive ? `${primaryColor}12` : 'transparent',
                borderWidth: 1,
                borderColor: isActive ? `${primaryColor}24` : 'transparent',
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 14, opacity: isActive ? 1 : 0.7 }}>{item.icon}</Text>
              <Text style={{ 
                fontWeight: isActive ? '800' : '600', 
                color: isActive ? primaryColor : subtext,
                fontSize: 14.5 
              }}>
                {item.label}
              </Text>
              {isActive && (
                <View style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 3, backgroundColor: primaryColor }} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 24, gap: 12 }}>
        <TouchableOpacity 
          onPress={toggleTheme}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderRadius: 12, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? '#334155' : '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
            {isDark ? <Sun size={16} color="#FBBF24" /> : <Moon size={16} color="#475569" />}
          </View>
          <Text style={{ color: text, fontWeight: '700', fontSize: 13 }}>
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
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} color={isDark ? '#FCA5A5' : '#EF4444'} />
          </View>
          <Text style={{ color: isDark ? '#FCA5A5' : '#EF4444', fontWeight: '800', fontSize: 13 }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, flexDirection: 'row' }}>
      {/* Sidebar Desktop */}
      {isDesktop && (
        <View style={{ width: 280, backgroundColor: sidebarBg, borderRightWidth: 1, borderRightColor: border }}>
          <SidebarContent />
        </View>
      )}

      {/* Mobile Sidebar Overlay */}
      {!isDesktop && isSidebarOpen && (
        <View style={{ position: 'absolute', inset: 0, zIndex: 1000, flexDirection: 'row' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} 
            onPress={() => setIsSidebarOpen(false)} 
          />
          <View style={{ width: 300, backgroundColor: sidebarBg, height: '100%' }}>
            <SidebarContent />
          </View>
        </View>
      )}

      {/* Main Content */}
      <View style={{ flex: 1, flexBasis: 0 }}>
        {/* Header */}
        <View style={{ 
          height: 72, 
          backgroundColor: headerBg, 
          borderBottomWidth: 1, 
          borderBottomColor: border, 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          zIndex: 100,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
            android: { elevation: 4 }
          })
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {!isDesktop && (
              <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <Menu size={22} color={text} />
              </TouchableOpacity>
            )}
            <View>
              {subtitle && <Text style={{ fontSize: 10, fontWeight: '800', color: primaryColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{subtitle}</Text>}
              <Text style={{ fontSize: 22, fontWeight: '900', color: text, letterSpacing: -0.5 }}>{title}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {actions}
            
            <View style={{ width: 1, height: 32, backgroundColor: border, marginHorizontal: 8 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ alignItems: 'flex-end', display: isDesktop ? 'flex' : 'none' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: text }}>{profile?.name || 'User'}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: subtext }}>{profile?.role?.toUpperCase() || portalName.toUpperCase()}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push(portalName === 'Admin' ? '/admin' : '/vendor' as any)}
                style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 14, 
                  backgroundColor: `${primaryColor}15`, 
                  borderWidth: 2,
                  borderColor: `${primaryColor}30`,
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <Text style={{ color: primaryColor, fontWeight: '900', fontSize: 16 }}>
                  {(profile?.name || 'U')[0].toUpperCase()}
                </Text>
              </TouchableOpacity>
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
