import Match from "../models/match.model.js";
import { Team } from "../models/team.model.js";


/**
 * Updates the team statistics based on a given match ID.
 * @param {ObjectId} matchId - The ID of the match to update team stats for.
 * @returns {Promise<string>} Success message if the stats were updated successfully.
 * @throws Will throw an error if the match is not found or there is a server error.
 */
const updateTeamStats = async (matchId) => {
    try {
        // Fetch the match details from the database
        const match = await Match.findById(matchId).populate('teams result.winner');

        if (!match) {
            throw new Error("Match not found");
        }

        const { teams, result } = match;
        const [team1, team2] = teams;

        // Update matches count for both teams
        await Team.updateMany(
            { _id: { $in: [team1, team2] } },
            { $inc: { 'stats.matches': 1 } }
        );

        // Check for the match result
        if (result.isTie) {
            // If the match is a tie, update draws for both teams
            await Team.updateMany(
                { _id: { $in: [team1, team2] } },
                { $inc: { 'stats.draws': 1 } }
            );
        } else {
            // If there is a winner, update wins and losses accordingly
            const winnerId = result.winner._id || result.winner.toString();
            const loserId = winnerId === team1.toString() ? team2 : team1;

            // Increment wins for the winning team
            await Team.updateOne(
                { _id: winnerId },
                { $inc: { 'stats.wins': 1 } }
            );

            // Increment losses for the losing team
            await Team.updateOne(
                { _id: loserId },
                { $inc: { 'stats.loss': 1 } }
            );
        }

        // Mark the match as having updated stats
        await Match.findByIdAndUpdate(matchId, { $set: { teamStats: true } });

        return "Team stats updated successfully";
    } catch (error) {
        console.error("Error updating team stats:", error);
        throw new Error("Unable to update team stats");
    }
};

export { updateTeamStats };
