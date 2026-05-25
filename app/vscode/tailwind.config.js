/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    './web/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Use VSCode theme colors directly
        border: "var(--vscode-panel-border)",
        input: "var(--vscode-input-background)",
        ring: "var(--vscode-focusBorder)",
        background: "var(--vscode-editor-background)",
        foreground: "var(--vscode-editor-foreground)",
        primary: {
          DEFAULT: "var(--vscode-list-activeSelectionBackground)",
          foreground: "var(--vscode-list-activeSelectionForeground)",
        },
        secondary: {
          DEFAULT: "var(--vscode-sideBar-background)",
          foreground: "var(--vscode-sideBar-foreground)",
        },
        destructive: {
          DEFAULT: "var(--vscode-errorForeground)",
          foreground: "var(--vscode-editor-foreground)",
        },
        muted: {
          DEFAULT: "var(--vscode-input-background)",
          foreground: "var(--vscode-descriptionForeground)",
        },
        accent: {
          DEFAULT: "var(--vscode-list-hoverBackground)",
          foreground: "var(--vscode-list-hoverForeground)",
        },
        popover: {
          DEFAULT: "var(--vscode-editorWidget-background)",
          foreground: "var(--vscode-editorWidget-foreground)",
        },
        card: {
          DEFAULT: "var(--vscode-sideBar-background)",
          foreground: "var(--vscode-sideBar-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
