import { BigDeckEnergy } from '../src/big-deck-energy';
import { TeamHeartsRuleset } from '../src/rulesets/team-hearts/team-hearts-ruleset';
import { StandardPlayingDeck } from '../src/deck-types/standard/standard-playing-deck';

/**
 * Example demonstrating team-based card game using the party system
 * 
 * This example shows:
 * - Creating a team-based game with parties
 * - Team resource sharing and status tracking
 * - Team win conditions
 * - Party-based access control
 */

async function runTeamHeartsExample() {
  console.log('=== Team Hearts Example ===\n');

  // Get BigDeckEnergy singleton instance
  const bde = BigDeckEnergy.getInstance();

  // Register the team hearts ruleset and standard deck
  bde.registerRuleset(new TeamHeartsRuleset());
  bde.registerDeckType(new StandardPlayingDeck());

  // Create a new game instance
  const gameInstance = bde.createGame('team-hearts', 'standard-playing-deck');

  // Add 4 players
  gameInstance.addParticipant('alice', 'Alice', false);
  gameInstance.addParticipant('bob', 'Bob', false);
  gameInstance.addParticipant('charlie', 'Charlie', false);
  gameInstance.addParticipant('diana', 'Diana', false);

  // Start the game (this will set up teams and deal cards)
  gameInstance.startGame();

  console.log('Game started with 4 players in 2 teams');
  console.log('Teams:');
  
  // Display team information
  const gameState = gameInstance.getGameState();
  for (const [partyId, party] of gameState.parties) {
    console.log(`  ${party.name}: ${party.participantIds.join(', ')}`);
    console.log(`    Score: ${party.status.score || 0}`);
    console.log(`    Tricks Won: ${party.status.tricks_won || 0}`);
  }

  console.log('\nPlayer positions:');
  for (const [participantId, participant] of gameState.participants) {
    const position = participant.status.position;
    const teamId = participant.partyId;
    const team = teamId ? gameState.parties.get(teamId) : null;
    console.log(`  ${participant.name} (${position}) - Team: ${team?.name || 'None'}`);
  }

  // Demonstrate team information sharing
  console.log('\n=== Team Communication Example ===');
  
  // Alice shares information with her teammate (Charlie)
  const ruleset = gameInstance.getRuleset() as TeamHeartsRuleset;
  
  // Simulate team communication
  gameInstance.processAction({
    type: 'share_team_info',
    participantId: 'alice',
    data: {
      message: 'I have the Queen of Spades, be careful!',
      targetTeammate: 'charlie'
    }
  });

  // Get team info for Alice
  const aliceTeamInfo = ruleset.getTeamInfo(gameInstance.getGameState(), 'alice');
  console.log('Alice\'s team info:', {
    teamName: aliceTeamInfo.teamName,
    teammates: aliceTeamInfo.teammates,
    score: aliceTeamInfo.score,
    communications: aliceTeamInfo.communications.length
  });

  // Demonstrate party resource access
  console.log('\n=== Party Resource Access Example ===');
  
  const api = gameInstance.getGameStateAPI();
  
  // Check if Alice can access her team's score pile
  const canAliceAccessTeamScore = api.canAccessPile('alice', 'party', 'score_cards', 'team_north_south');
  console.log(`Alice can access team score pile: ${canAliceAccessTeamScore}`);
  
  // Check if Alice can access the other team's score pile
  const canAliceAccessOtherTeamScore = api.canAccessPile('alice', 'party', 'score_cards', 'team_east_west');
  console.log(`Alice can access other team's score pile: ${canAliceAccessOtherTeamScore}`);

  // Simulate a few card plays to demonstrate team mechanics
  console.log('\n=== Simulating Card Play ===');
  
  // Get current player
  let currentPlayer = null;
  for (const [participantId, participant] of gameInstance.getGameState().participants) {
    if (participant.status.is_turn) {
      currentPlayer = participantId;
      break;
    }
  }

  if (currentPlayer) {
    console.log(`Current player: ${currentPlayer}`);
    
    // Get player's hand
    const hand = gameInstance.getGameState().hands.get(`${currentPlayer}_hand`);
    if (hand) {
      const cardsPile = hand.piles.get('cards');
      if (cardsPile && cardsPile.cards.length > 0) {
        const firstCard = cardsPile.cards[0];
        if (firstCard) {
          console.log(`Playing card: ${firstCard.card.properties.rank} of ${firstCard.card.properties.suit}`);
          
          // Play the card
          gameInstance.processAction({
            type: 'play_card',
            participantId: currentPlayer,
            data: {
              cardId: firstCard.card.id
            }
          });
          
          // Show current trick
          const trickInfo = ruleset.getCurrentTrick(gameInstance.getGameState());
          if (trickInfo) {
            console.log(`Cards in current trick: ${trickInfo.cards.length}`);
            console.log(`Trick leader: ${trickInfo.leader}`);
          }
        }
      }
    }
  }

  // Display final game state
  console.log('\n=== Final Game State ===');
  const finalState = gameInstance.getGameState();
  
  console.log('Teams:');
  for (const [partyId, party] of finalState.parties) {
    console.log(`  ${party.name}:`);
    console.log(`    Members: ${party.participantIds.join(', ')}`);
    console.log(`    Score: ${party.status.score || 0}`);
    console.log(`    Tricks Won: ${party.status.tricks_won || 0}`);
    console.log(`    Score Cards: ${party.piles.get('score_cards')?.cards.length || 0}`);
  }

  console.log('\nGame Status:');
  console.log(`  Round: ${finalState.gameboard.status.current_round}`);
  console.log(`  Trick: ${finalState.gameboard.status.trick_number}`);
  console.log(`  Hearts Broken: ${finalState.gameboard.status.hearts_broken}`);

  // Check win condition
  const winResult = gameInstance.checkWinCondition();
  if (winResult.gameEnded) {
    console.log(`\nGame Over! Winner: ${winResult.winners.join(', ')}`);
    console.log(`Reason: ${winResult.reason}`);
  } else {
    console.log('\nGame is still in progress...');
  }

  console.log('\n=== Party System Features Demonstrated ===');
  console.log('✓ Team creation and participant assignment');
  console.log('✓ Shared team resources (score piles)');
  console.log('✓ Team status tracking (score, tricks won)');
  console.log('✓ Team communication system');
  console.log('✓ Party-based access control');
  console.log('✓ Team win conditions');
  console.log('✓ Party resource management');
}

// Run the example
if (require.main === module) {
  runTeamHeartsExample().catch(console.error);
}

export { runTeamHeartsExample };