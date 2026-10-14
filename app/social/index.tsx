import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { useApiQuery } from '../../hooks/useApiQuery';
import { contentApi } from '../../services/nasjakApi';
import type { SocialLink, SocialPost } from '../../types';
import { relativeTime } from '../../utils/date';

interface SocialItem {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  gradient: [string, string];
  handle: string;
  url: string;
  deepLink?: string;
  cta: string;
}

const SOCIAL_LINKS: SocialItem[] = [
  {
    id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E1306C',
    gradient: ['#833AB4', '#E1306C'], handle: '@komunitasnasuha',
    url: 'https://www.instagram.com/komunitasnasuha/',
    deepLink: 'instagram://user?username=komunitasnasuha',
    cta: 'FOLLOW',
  },
  {
    id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000',
    gradient: ['#25F4EE', '#FE2C55'], handle: '@komunitasnasuha',
    url: 'https://www.tiktok.com/@komunitasnasuha',
    deepLink: 'tiktok://user?username=komunitasnasuha',
    cta: 'FOLLOW',
  },
  {
    id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000',
    gradient: ['#FF0000', '#CC0000'], handle: 'NASUHA Channel',
    url: 'https://www.youtube.com/@NasuhaChannel',
    deepLink: 'youtube://www.youtube.com/@NasuhaChannel',
    cta: 'SUBSCRIBE',
  },
  {
    id: 'whatsapp', name: 'WhatsApp Community', icon: 'logo-whatsapp', color: '#25D366',
    gradient: ['#25D366', '#128C7E'], handle: 'NASUHA Jakarta',
    url: 'https://chat.whatsapp.com/',
    deepLink: 'whatsapp://send?phone=',
    cta: 'GABUNG',
  },
  {
    id: 'website', name: 'Website', icon: 'globe-outline', color: '#00B4D8',
    gradient: ['#00B4D8', '#0077B6'], handle: 'nasuha.id',
    url: 'https://nasuha.id',
    cta: 'KUNJUNGI',
  },
];

interface ContentPost {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  type: string;
  title: string;
  description: string;
  likes?: string;
  comments?: string;
  date: string;
  thumbnail?: string | null;
  url: string;
  deepLink?: string;
}

const NASUHA_CONTENT: ContentPost[] = [
  {
    id: 'ig-1', platform: 'instagram', type: 'reel',
    title: 'Bahaya Riba dalam Kehidupan Sehari-hari',
    description: 'Ustadz Anas menjelaskan dampak riba yang sering kita abaikan...',
    likes: '12.5K', comments: '843', date: '2 jam lalu',
    url: 'https://www.instagram.com/komunitasnasuha/',
    deepLink: 'instagram://user?username=komunitasnasuha',
  },
  {
    id: 'ig-2', platform: 'instagram', type: 'post',
    title: 'Jadwal TSN September 2026',
    description: 'Save the date! Temu Sahabat NASUHA edisi September di Masjid Al-Ikhlas Jakarta Timur',
    likes: '8.2K', comments: '521', date: '1 hari lalu',
    url: 'https://www.instagram.com/komunitasnasuha/',
    deepLink: 'instagram://user?username=komunitasnasuha',
  },
  {
    id: 'ig-3', platform: 'instagram', type: 'reel',
    title: 'Kisah Lunas Hutang Riba 200 Juta!',
    description: 'Testimoni mengharukan dari Kak Ahmad yang berhasil bebas riba bersama LBU NASUHA',
    likes: '24.1K', comments: '1.2K', date: '3 hari lalu',
    url: 'https://www.instagram.com/komunitasnasuha/',
    deepLink: 'instagram://user?username=komunitasnasuha',
  },
  {
    id: 'ig-4', platform: 'instagram', type: 'post',
    title: 'Tips Hijrah Finansial untuk Pemula',
    description: '5 langkah awal meninggalkan riba dan memulai kehidupan finansial yang berkah',
    likes: '15.8K', comments: '967', date: '5 hari lalu',
    url: 'https://www.instagram.com/komunitasnasuha/',
    deepLink: 'instagram://user?username=komunitasnasuha',
  },
  {
    id: 'tt-1', platform: 'tiktok', type: 'video',
    title: 'POV: Kamu akhirnya bebas riba',
    description: 'Ketika Allah beri jalan keluar dari jeratan hutang riba... #nasuha #bebasriba #hijrah',
    likes: '45.2K', comments: '2.1K', date: '6 jam lalu',
    url: 'https://www.tiktok.com/@komunitasnasuha',
    deepLink: 'tiktok://user?username=komunitasnasuha',
  },
  {
    id: 'tt-2', platform: 'tiktok', type: 'video',
    title: 'Riba itu Bukan Cuma Soal Uang',
    description: 'Banyak yang nggak sadar kalau riba ada di sekitar kita... #antiriba #nasuhajakarta',
    likes: '32.7K', comments: '1.5K', date: '1 hari lalu',
    url: 'https://www.tiktok.com/@komunitasnasuha',
    deepLink: 'tiktok://user?username=komunitasnasuha',
  },
  {
    id: 'tt-3', platform: 'tiktok', type: 'video',
    title: 'Suasana TSN Agustus 2026',
    description: '1000+ sahabat NASUHA berkumpul di Jakarta! MasyaAllah... #TSN #nasuhajakarta #ukhuwah',
    likes: '28.9K', comments: '1.8K', date: '4 hari lalu',
    url: 'https://www.tiktok.com/@komunitasnasuha',
    deepLink: 'tiktok://user?username=komunitasnasuha',
  },
  {
    id: 'tt-4', platform: 'tiktok', type: 'video',
    title: 'Reply to @user: Cara Daftar LBU',
    description: 'Banyak yang tanya gimana cara ikut LBU, ini step by step-nya... #LBU #langkahbebasutang',
    likes: '18.4K', comments: '934', date: '1 minggu lalu',
    url: 'https://www.tiktok.com/@komunitasnasuha',
    deepLink: 'tiktok://user?username=komunitasnasuha',
  },
];

type TabFilter = 'semua' | 'instagram' | 'tiktok';

const PLATFORM_META: Record<ContentPost['platform'], { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; colors: [string, string, ...string[]] }> = {
  instagram: { label: 'Instagram', icon: 'logo-instagram', colors: ['#833AB4', '#C13584', '#E1306C'] },
  tiktok: { label: 'TikTok', icon: 'logo-tiktok', colors: ['#010101', '#25F4EE', '#FE2C55'] },
  youtube: { label: 'YouTube', icon: 'logo-youtube', colors: ['#FF0000', '#CC0000'] },
};

function linkFromRemote(link: SocialLink): SocialItem {
  return {
    ...link,
    icon: link.icon as SocialItem['icon'],
    gradient: [link.gradient[0] || link.color, link.gradient[1] || link.gradient[0] || link.color],
    deepLink: link.deepLink || undefined,
  };
}

function postFromRemote(post: SocialPost): ContentPost {
  return {
    id: post.id,
    platform: post.platform,
    type: post.type,
    title: post.title,
    description: post.description,
    date: relativeTime(post.publishedAt),
    thumbnail: post.thumbnail,
    url: post.url,
    deepLink: post.deepLink || undefined,
  };
}

function postTypeLabel(type: string): string {
  const value = type.toLowerCase();
  if (value.startsWith('reel')) return 'Reels';
  if (value === 'video') return 'Video';
  return 'Post';
}

function SocialScreen() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];
  const [activeTab, setActiveTab] = useState<TabFilter>('semua');
  const { data: remoteLinks } = useApiQuery(() => contentApi.socialLinks(), [], { cacheKey: 'social_links' });
  const { data: remotePosts } = useApiQuery(() => contentApi.socialPosts(), [], { cacheKey: 'social_posts' });
  const socialLinks = remoteLinks?.length ? remoteLinks.map(linkFromRemote) : SOCIAL_LINKS;
  const content = remotePosts?.length ? remotePosts.map(postFromRemote) : NASUHA_CONTENT;

  const filteredContent = activeTab === 'semua'
    ? content
    : content.filter((p) => p.platform === activeTab);

  const handleOpen = useCallback(async (item: { deepLink?: string; url: string; name?: string }) => {
    try {
      if (item.deepLink) {
        const supported = await Linking.canOpenURL(item.deepLink);
        if (supported) {
          await Linking.openURL(item.deepLink);
          return;
        }
      }
      await Linking.openURL(item.url);
    } catch {
      Alert.alert('Error', `Tidak dapat membuka link`);
    }
  }, []);

  const handleOpenPost = useCallback(async (post: ContentPost) => {
    await handleOpen({ deepLink: post.deepLink, url: post.url });
  }, [handleOpen]);

  const tabs: { id: TabFilter; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { id: 'semua', label: 'Semua', icon: 'apps' },
    { id: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
    { id: 'tiktok', label: 'TikTok', icon: 'logo-tiktok' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#00B4D8', '#0077B6']} style={styles.hero}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Ionicons name="share-social" size={48} color="#FFF" />
        <Text style={styles.heroTitle}>NASUHA Social</Text>
        <Text style={styles.heroSub}>Ikuti media sosial resmi Komunitas NASUHA</Text>
      </LinearGradient>

      {/* Social Account Cards */}
      {socialLinks.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => handleOpen(item as any)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
        >
          <LinearGradient colors={item.gradient} style={styles.cardIcon}>
            <Ionicons name={item.icon} size={28} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.cardHandle, { color: colors.textSecondary }]}>{item.handle}</Text>
          </View>
          <Pressable onPress={() => handleOpen(item as any)} style={[styles.ctaBtn, { backgroundColor: item.gradient[0] }]}>
            <Text style={styles.ctaText}>{item.cta}</Text>
          </Pressable>
        </Pressable>
      ))}

      {/* Content Feed Section */}
      <View style={styles.feedSection}>
        <Text style={[styles.feedTitle, { color: colors.text }]}>Konten Terbaru</Text>
        <Text style={[styles.feedSubtitle, { color: colors.textSecondary }]}>
          Konten terbaru dari Instagram & TikTok NASUHA Jakarta
        </Text>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#FFF' : colors.textSecondary}
                />
                <Text style={[styles.tabLabel, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Content Cards */}
        {filteredContent.map((post) => (
          <Pressable
            key={post.id}
            onPress={() => handleOpenPost(post)}
            style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
          >
            <View style={styles.postHeader}>
              <LinearGradient
                colors={PLATFORM_META[post.platform].colors}
                style={styles.postPlatformIcon}
              >
                <Ionicons
                  name={PLATFORM_META[post.platform].icon}
                  size={16}
                  color="#FFF"
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={styles.postNameRow}>
                  <Text style={[styles.postPlatformName, { color: colors.text }]}>
                    {PLATFORM_META[post.platform].label}
                  </Text>
                  <View style={[styles.postTypeBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.postTypeText, { color: colors.primary }]}>
                      {postTypeLabel(post.type)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.postDate, { color: colors.textMuted }]}>{post.date}</Text>
              </View>
            </View>

            {post.thumbnail ? (
              <Image source={{ uri: post.thumbnail }} style={styles.postThumbnail} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={PLATFORM_META[post.platform].colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.postThumbnail}
              >
                <Ionicons
                  name={postTypeLabel(post.type) === 'Post' ? 'image' : 'play-circle'}
                  size={40}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.postThumbnailText}>Ketuk untuk buka di {PLATFORM_META[post.platform].label}</Text>
              </LinearGradient>
            )}

            <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
            <Text style={[styles.postDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {post.description}
            </Text>

            <View style={styles.postStats}>
              {!!post.likes && (
                <View style={styles.postStatItem}>
                  <Ionicons name="heart" size={14} color="#E1306C" />
                  <Text style={[styles.postStatText, { color: colors.textSecondary }]}>{post.likes}</Text>
                </View>
              )}
              {!!post.comments && (
                <View style={styles.postStatItem}>
                  <Ionicons name="chatbubble" size={14} color={colors.primary} />
                  <Text style={[styles.postStatText, { color: colors.textSecondary }]}>{post.comments}</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Ketuk konten untuk membuka langsung di Instagram atau TikTok. Pastikan aplikasi sudah terinstall untuk pengalaman terbaik.
        </Text>
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

export default memo(SocialScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  heroTitle: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.md },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  cardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700' },
  cardHandle: { fontSize: FontSize.sm, marginTop: 2 },
  ctaBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full },
  ctaText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: '800' },

  // Feed Section
  feedSection: { marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  feedTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  feedSubtitle: { fontSize: FontSize.sm, marginTop: 2, marginBottom: Spacing.md },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  tabLabel: { fontSize: FontSize.sm, fontWeight: '600' },

  // Post Cards
  postCard: { borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.md, overflow: 'hidden' },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  postPlatformIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  postPlatformName: { fontSize: FontSize.md, fontWeight: '700' },
  postTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  postTypeText: { fontSize: FontSize.xs, fontWeight: '700' },
  postDate: { fontSize: FontSize.xs, marginTop: 1 },
  postThumbnail: { height: 180, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  postThumbnailText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, fontWeight: '600' },
  postTitle: { fontSize: FontSize.md, fontWeight: '700', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  postDesc: { fontSize: FontSize.sm, lineHeight: 18, paddingHorizontal: Spacing.md, marginTop: 4 },
  postStats: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  postStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStatText: { fontSize: FontSize.sm, fontWeight: '600' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 18 },
});
