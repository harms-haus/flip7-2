# Go Fish Game Configuration

This directory contains the Go Fish game configuration for DeckInABox CLI.

## Game Rules

Go Fish is a classic card game for 2-6 players:

1. **Setup**: Each player gets 7 cards (5 if more than 4 players)
2. **Objective**: Collect "books" (sets of 4 cards of the same rank)
3. **Gameplay**: 
   - Players take turns asking other players for cards of specific ranks
   - If the asked player has cards of that rank, they give all of them to the asking player
   - If not, they say "Go Fish" and the asking player draws from the deck
   - When a player collects all 4 cards of a rank, they place them as a "book"
4. **Winning**: Game ends when all books are collected or no more moves are possible
   - Winner is the player with the most books

## Controls

- **A**: Ask another player for cards of a specific rank
- **H**: Show your current hand
- **↑/↓**: Navigate through available actions
- **Enter**: Select an action

## Features

- Visual card display with suit symbols
- Real-time book counting
- Turn-based gameplay with clear indicators
- Automatic book collection when 4 cards of same rank are obtained
- Win screen with final scores and statistics

## Implementation Details

The Go Fish configuration integrates with the BigDeckEnergy library's Go Fish ruleset and provides:

- Custom UI rendering for Go Fish-specific game state
- Interactive card asking interface
- Book collection visualization
- Player status and scoring display
- Turn management and game flow control