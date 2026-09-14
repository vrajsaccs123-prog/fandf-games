/**
 * Condensed in-game help content — quick reference shown in the rules drawer.
 * Full rules live in each game's rules.ts; help is tailored for mid-game lookup.
 */

export interface HelpSection {
  title: string;
  text: string;
  items?: string[];
  /** Game-specific key for custom section chrome (e.g. Modern Art auction icon) */
  iconKey?: string;
}

export interface GameHelpRules {
  sections: HelpSection[];
}
