import { useWindowDimensions } from "react-native"

// Breakpoints tuned for phones: small (SE-class), regular, large (Pro Max/big
// Android), and tablet/unfolded-foldable widths. Used to pick FlatList column
// counts and spacing so grids don't look cramped or sparse on any device.
export function useResponsive() {
  const { width, height } = useWindowDimensions()

  const isSmall = width < 360
  const isTablet = width >= 600
  const isLandscape = width > height

  const productColumns = isTablet ? 4 : width >= 400 ? 3 : 2
  const cardGap = isSmall ? 8 : 12
  const horizontalPadding = isTablet ? 24 : isSmall ? 12 : 16

  return { width, height, isSmall, isTablet, isLandscape, productColumns, cardGap, horizontalPadding }
}
