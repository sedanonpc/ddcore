import usernameWordsJson from '../assets/usernameWords.json';
import { UsernameWords } from '../types';

/**
 * Utility functions for generating random usernames
 * Uses the word lists from usernameWords.json to create memorable usernames
 */
export class UsernameGenerator {
  private words: UsernameWords;

  constructor() {
    this.words = usernameWordsJson as UsernameWords;
  }

  /**
   * Generate a random username in the format: Adjective + Noun + Year (1970-1999)
   */
  public generateUsername(): string {
    const randomAdjective = this.getRandomAdjective();
    const randomNoun = this.getRandomNoun();
    const randomYear = this.getRandomYear();

    return `${randomAdjective}${randomNoun}${randomYear}`;
  }

  /**
   * Get a random adjective from the word list
   */
  private getRandomAdjective(): string {
    const index = Math.floor(Math.random() * this.words.adjectives.length);
    return this.words.adjectives[index];
  }

  /**
   * Get a random noun from the word list
   */
  private getRandomNoun(): string {
    const index = Math.floor(Math.random() * this.words.nouns.length);
    return this.words.nouns[index];
  }

  /**
   * Get a random year between 1970 and 1999
   */
  private getRandomYear(): number {
    return Math.floor(Math.random() * 30) + 1970;
  }

  /**
   * Validate if a username follows the expected format
   */
  public isValidUsernameFormat(username: string): boolean {
    // Check if username ends with a year between 1970-1999
    const yearMatch = username.match(/(\d{4})$/);
    if (!yearMatch) return false;

    const year = parseInt(yearMatch[1]);
    if (year < 1970 || year > 1999) return false;

    // Remove the year and check if the remaining part contains valid words
    const nameWithoutYear = username.slice(0, -4);
    
    // Check if it starts with a valid adjective
    const startsWithAdjective = this.words.adjectives.some(adj => 
      nameWithoutYear.startsWith(adj)
    );

    if (!startsWithAdjective) return false;

    // Find the adjective and check if the rest is a valid noun
    const matchingAdjective = this.words.adjectives.find(adj => 
      nameWithoutYear.startsWith(adj)
    );

    if (!matchingAdjective) return false;

    const remainingPart = nameWithoutYear.slice(matchingAdjective.length);
    const isValidNoun = this.words.nouns.includes(remainingPart);

    return isValidNoun;
  }

  /**
   * Generate multiple unique usernames
   */
  public generateMultipleUsernames(count: number): string[] {
    const usernames = new Set<string>();
    
    while (usernames.size < count) {
      usernames.add(this.generateUsername());
    }

    return Array.from(usernames);
  }

  /**
   * Get username statistics
   */
  public getStats(): { totalAdjectives: number; totalNouns: number; totalCombinations: number } {
    const totalAdjectives = this.words.adjectives.length;
    const totalNouns = this.words.nouns.length;
    const totalYears = 30; // 1970-1999
    const totalCombinations = totalAdjectives * totalNouns * totalYears;

    return {
      totalAdjectives,
      totalNouns,
      totalCombinations
    };
  }
}

// Export singleton instance
export const usernameGenerator = new UsernameGenerator();
