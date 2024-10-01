// import Match from "../models/match.model";

// const processBattingEvent = async ({ event, batsmanId, bowlerId, fielderId, matchId, inningId }) => {
//     try {
//         // Find the match by its ID
//         const match = await Match.findById(matchId).populate('innings.battingPerformances');

//         if (!match) {
//             throw new Error('Match not found');
//         }

//         // Find the inning by its ID
//         const inning = match.innings.find(inn => inn._id.toString() === inningId);

//         if (!inning) {
//             throw new Error('Inning not found');
//         }

//         // Find the batting performance for the specified batsman in the inning
//         const battingPerformance = inning.battingPerformances.find(bp => bp.player.toString() === batsmanId);

//         if (!battingPerformance) {
//             throw new Error('Batsman performance not found');
//         }

//         // Handle different types of events
//         if (event.startsWith("-8")) {
//             // Running between wickets event
//             const runs = parseInt(event.slice(2)); // Extract the runs
//             console.log(`Running between wickets: ${runs} runs`);

//             // Update runs and balls faced
//             battingPerformance.runs += runs;
//             battingPerformance.ballsFaced += 1;

//         } else if (event === 6 || event === 4) {
//             // Boundary event (either 6 or 4)
//             console.log(`Boundary: ${event} runs`);

//             // Update runs, balls faced, and boundary stats
//             battingPerformance.runs += event;
//             battingPerformance.ballsFaced += 1;

//             if (event === 4) {
//                 battingPerformance.fours += 1;
//             } else if (event === 6) {
//                 battingPerformance.sixes += 1;
//             }

//         } else if (event === 'Bowled') {
//             console.log('Batsman is Bowled');

//             // Mark as out and update dismissal type and bowler
//             battingPerformance.isOut = true;
//             battingPerformance.dismissalType = 'Bowled';
//             battingPerformance.bowler = bowlerId;

//         } else if (event === 'Caught') {
//             console.log('Batsman is Caught');

//             // Mark as out and update dismissal type, bowler, and fielder
//             battingPerformance.isOut = true;
//             battingPerformance.dismissalType = 'Caught';
//             battingPerformance.bowler = bowlerId;
//             if (fielderId) {
//                 battingPerformance.fielder = fielderId;
//             }

//         } else if (event === 'Stumped') {
//             console.log('Batsman is Stumped');

//             // Mark as out and update dismissal type and fielder
//             battingPerformance.isOut = true;
//             battingPerformance.dismissalType = 'Stumped';
//             if (fielderId) {
//                 battingPerformance.fielder = fielderId;
//             }

//         } else if (event === 'LBW') {
//             console.log('Batsman is LBW');

//             // Mark as out and update dismissal type and bowler
//             battingPerformance.isOut = true;
//             battingPerformance.dismissalType = 'LBW';
//             battingPerformance.bowler = bowlerId;

//         }

//         // Save the match with the updated batting performance
//         await match.save();

//         console.log('Batting performance updated successfully');
//     } catch (error) {
//         console.error('Error processing batting event:', error.message);
//     }
// };


// export { processBattingEvent }