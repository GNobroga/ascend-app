import { GlobeIcon, LinkIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from '@/shared/components/social-icons';

export const SocialNetwork = {
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TIKTOK: 'tiktok',
  YOUTUBE: 'youtube',
  X: 'x',
  LINKEDIN: 'linkedin',
  WEBSITE: 'website',
} as const;

export type SocialNetwork = (typeof SocialNetwork)[keyof typeof SocialNetwork];

export const SOCIAL_NETWORKS = Object.values(SocialNetwork);

export type SocialLink = {
  network: SocialNetwork;
  url: string;
};

type SocialNetworkConfig = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  domains: string[] | null;
  handleUrl: ((handle: string) => string) | null;
  placeholder: string;
};

export const SOCIAL_NETWORK_CONFIG: Record<SocialNetwork, SocialNetworkConfig> = {
  [SocialNetwork.INSTAGRAM]: {
    label: 'Instagram',
    icon: InstagramIcon,
    domains: ['instagram.com'],
    handleUrl: (handle) => `https://instagram.com/${handle}`,
    placeholder: '@seunegocio',
  },
  [SocialNetwork.FACEBOOK]: {
    label: 'Facebook',
    icon: FacebookIcon,
    domains: ['facebook.com', 'fb.com'],
    handleUrl: (handle) => `https://facebook.com/${handle}`,
    placeholder: 'seunegocio ou link da página',
  },
  [SocialNetwork.TIKTOK]: {
    label: 'TikTok',
    icon: TikTokIcon,
    domains: ['tiktok.com'],
    handleUrl: (handle) => `https://tiktok.com/@${handle}`,
    placeholder: '@seunegocio',
  },
  [SocialNetwork.YOUTUBE]: {
    label: 'YouTube',
    icon: YouTubeIcon,
    domains: ['youtube.com', 'youtu.be'],
    handleUrl: (handle) => `https://youtube.com/@${handle}`,
    placeholder: '@seucanal',
  },
  [SocialNetwork.X]: {
    label: 'X (Twitter)',
    icon: XIcon,
    domains: ['x.com', 'twitter.com'],
    handleUrl: (handle) => `https://x.com/${handle}`,
    placeholder: '@seunegocio',
  },
  [SocialNetwork.LINKEDIN]: {
    label: 'LinkedIn',
    icon: LinkedInIcon,
    domains: ['linkedin.com'],
    handleUrl: null,
    placeholder: 'https://linkedin.com/company/seunegocio',
  },
  [SocialNetwork.WEBSITE]: {
    label: 'Site',
    icon: GlobeIcon,
    domains: null,
    handleUrl: null,
    placeholder: 'https://seunegocio.com.br',
  },
};

export const FALLBACK_SOCIAL_ICON = LinkIcon;

const isSocialNetwork = (value: string): value is SocialNetwork => SOCIAL_NETWORKS.some((network) => network === value);

export const socialNetworkConfig = (network: string): SocialNetworkConfig | null =>
  isSocialNetwork(network) ? SOCIAL_NETWORK_CONFIG[network] : null;

const HANDLE_PATTERN = /^@?[\w.-]+$/;

export const toSocialUrl = (network: SocialNetwork, value: string): string | null => {
  const input = value.trim();
  if (!input) return null;

  const { handleUrl } = SOCIAL_NETWORK_CONFIG[network];
  if (handleUrl && HANDLE_PATTERN.test(input)) return handleUrl(input.replace(/^@/, ''));

  const withProtocol = /^https?:\/\//i.test(input) ? input.replace(/^http:\/\//i, 'https://') : `https://${input}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
};

export const isSocialUrlValid = (network: SocialNetwork, url: string) => {
  const { domains } = SOCIAL_NETWORK_CONFIG[network];
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'https:' || !hostname.includes('.')) return false;
  if (!domains) return true;

  const host = hostname.toLowerCase();
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
};
