import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();

  // Standard breakpoints
  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  
  // Logical groupings
  const isWide = width >= 900;
  const isNarrow = width < 900;

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isNarrow,
  };
}
