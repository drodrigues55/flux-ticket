import { useContext } from 'react';
import { ThemeContext, ThemeMode } from '../pages/_app';

export function useTheme() {
  const context = useContext(ThemeContext);
  return {
    theme: context.theme,
    isDark: context.theme === 'dark',
    toggleTheme: context.toggleTheme,
    setTheme: context.setTheme,
  };
}
