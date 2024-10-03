// eventProcessor.js
const processEvent = async (event, curPlayers, onStrikeBatsman, db) => {
  try {
    if (event.startsWith("-1")) {
      // Example: Player run out, change on-strike batsman
      const updatedPlayers = curPlayers.filter((player) => {
        return player.id !== curPlayers?.[onStrikeBatsman].id;
      });

      // Perform DB operation for run-out
      await db.updatePlayerState(onStrikeBatsman, { status: 'run-out' });
      console.log("Player run out");
    }

    if (event.startsWith("-8")) {
      // Example: Event for run-out with 8 runs involved
      const runs = parseInt(event.slice(1));  // Extract the run part from event e.g., '4' from '-84'

      // Update total runs and player stats
      await db.updateTeamScore({ runs: runs });
      console.log("Updated team score with additional runs: ", runs);
    }

    if (event.startsWith("-2")) {
      // Example: Two runs event
      const runs = parseInt(event.slice(1));  // Extract the run part (if needed)

      // Update database to add 2 runs
      await db.updateTeamScore({ runs: 2 });
      console.log("2 runs added to the score");
    }

    if (event.startsWith("-3")) {
      // Example: Three runs event
      const runs = parseInt(event.slice(1));  // Extract the run part (if necessary)

      // Update database to add 3 runs
      await db.updateTeamScore({ runs: 3 });
      console.log("3 runs added to the score");
    }

    if (event === 'Bowled') {
      // Example: Bowled event, mark player as out
      await db.updatePlayerState(onStrikeBatsman, { status: 'bowled' });
      console.log("Player is bowled");
    }

    // Add additional event handlers as needed
  } catch (error) {
    console.error("Error processing event:", error);
  }
};

export { processEvent };
