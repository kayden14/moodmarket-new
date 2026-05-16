export interface BaseTheme {
  background:    string;
  card:          string;
  border:        string;
  textPrimary:   string;
  textSecondary: string;
  inactive:      string;
}

export interface AppTheme extends BaseTheme {
  primary:   string;
  secondary: string;
  tint:      string;
  fontHeading: string;
  fontBody:    string;
  isDark:    boolean;
}
