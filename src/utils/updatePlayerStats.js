import Match from "../models/match.model.js";
import { Player } from "../models/player.model.js";


/**
 * Function to update player stats based on a match.
 * @param {String} matchId - The ID of the match.
 * @returns {Object} - Status and message of the operation.
 */
export const updatePlayerStats = async (matchId) => {
    try {
        // Fetch the match data by ID
        const match = await Match.findById(matchId)
            .populate({
                path: 'playing11.players',
                model: 'Player'
            })
            .populate({
                path: 'innings.battingPerformances.player',
                model: 'Player'
            })
            .populate({
                path: 'innings.bowlingPerformances.player',
                model: 'Player'
            });

        if (!match) {
            return { status: 404, message: "Match not found" };
        }

        // Loop through each team's playing11 in the match
        for (const team of match.playing11) {
            for (const playerId of team.players) {
                // Increment matches played for each player in the playing11
                await Player.findByIdAndUpdate(playerId, {
                    $inc: { "stats.matches": 1 }
                });
            }
        }

        // Loop through each innings in the match to update batting and bowling stats
        for (const innings of match.innings) {
            // Update Batting Stats for each innings
            for (const batting of innings.battingPerformances) {
                const player = await Player.findById(batting.player);

                // Update batting innings and runs
                const newHighestScore = Math.max(player.stats.highestScore, batting.runs);
                const updateBattingStats = {
                    $inc: {
                        "stats.battingInnings": 1,
                        "stats.runs": batting.runs,
                        "stats.ballFaced": batting.ballsFaced,
                    },
                    $set: { "stats.highestScore": newHighestScore }
                };

                // Increment centuries and half-centuries if applicable
                if (batting.runs >= 100) updateBattingStats.$inc["stats.centuries"] = 1;
                if (batting.runs >= 50 && batting.runs < 100) updateBattingStats.$inc["stats.halfCenturies"] = 1;

                // Update the player's batting stats
                await Player.findByIdAndUpdate(batting.player, updateBattingStats);
            }

            // Update Bowling Stats for each innings
            for (const bowling of innings.bowlingPerformances) {
                const player = await Player.findById(bowling.player);

                // Calculate economy rate
                const totalOvers = bowling.overs + (bowling.balls % 6) / 10;
                const economyRate = bowling.runsConceded / totalOvers;

                // Update best bowling figures (BB)
                let bestBowling = player.stats.BB;
                const currentBB = `${bowling.wickets}/${bowling.runsConceded}`;
                if (!bestBowling || isBetterBB(currentBB, bestBowling)) {
                    bestBowling = currentBB;
                }

                const updateBowlingStats = {
                    $inc: {
                        "stats.bowlingInnings": 1,
                        "stats.runsConceded": bowling.runsConceded,
                        "stats.wickets": bowling.wickets,
                    },
                    $set: {
                        "stats.economy": economyRate,
                        "stats.BB": bestBowling
                    }
                };

                // Increment 5-wicket and 10-wicket hauls if applicable
                if (bowling.wickets >= 5) updateBowlingStats.$inc["stats.FiveWickets"] = 1;
                if (bowling.wickets >= 10) updateBowlingStats.$inc["stats.TenWickets"] = 1;

                // Update the player's bowling stats
                await Player.findByIdAndUpdate(bowling.player, updateBowlingStats);
            }
        }

        // Mark the match as having updated player stats
        await Match.findByIdAndUpdate(matchId, { $set: { playerStats: true } });

        // Return a success response
        return { status: 200, message: "Player stats updated successfully!" };
    } catch (error) {
        console.error("Error updating player stats:", error);
        return { status: 500, message: "Error updating player stats", error };
    }
};

/**
 * Utility to compare bowling figures.
 * @param {String} currentBB - Current best bowling (e.g., "5/20").
 * @param {String} bestBB - Existing best bowling (e.g., "4/15").
 * @returns {Boolean} - True if `currentBB` is better than `bestBB`.
 */
function isBetterBB(currentBB, bestBB) {
    const [currentWickets, currentRuns] = currentBB.split('/').map(Number);
    const [bestWickets, bestRuns] = bestBB.split('/').map(Number);

    // More wickets or fewer runs conceded indicate better bowling
    return (
        currentWickets > bestWickets ||
        (currentWickets === bestWickets && currentRuns < bestRuns)
    );
}
